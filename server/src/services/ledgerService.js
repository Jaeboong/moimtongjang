import { LedgerEntry } from "../models/LedgerEntry.js";

const START_YEAR = 2025;
const START_MONTH_INDEX = 9; // October (0-based)
const DONATION_SOURCE = "admin_sponsorship";
const DONATION_ROW_ID = "donation";

export function monthKeyValid(monthKey) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey);
}

export function makeRecentMonthKeys(total) {
  const out = [];
  const date = new Date();
  const minDate = new Date(START_YEAR, START_MONTH_INDEX, 1);
  minDate.setHours(0, 0, 0, 0);

  date.setDate(1);
  date.setHours(0, 0, 0, 0);

  for (let i = 0; i < total && date >= minDate; i += 1) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    out.push(`${year}-${month}`);
    date.setMonth(date.getMonth() - 1);
  }

  return out;
}

export function getSummaryAvailableYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear; year >= START_YEAR; year -= 1) {
    years.push(year);
  }
  return years;
}

export function resolveSummaryYear(rawYear) {
  const availableYears = getSummaryAvailableYears();
  const parsed = Number(rawYear);
  const selectedYear =
    Number.isInteger(parsed) && availableYears.includes(parsed) ? parsed : availableYears[0];

  return { selectedYear, availableYears };
}

export function makeYearMonthKeys(year) {
  const out = [];
  const minDate = new Date(START_YEAR, START_MONTH_INDEX, 1);
  const now = new Date();
  const maxMonth = year === now.getFullYear() ? now.getMonth() + 1 : 12;
  minDate.setHours(0, 0, 0, 0);

  for (let month = maxMonth; month >= 1; month -= 1) {
    const cursor = new Date(year, month - 1, 1);
    cursor.setHours(0, 0, 0, 0);
    if (cursor < minDate) {
      continue;
    }
    out.push(`${year}-${String(month).padStart(2, "0")}`);
  }

  return out;
}

export async function calculateBalance() {
  const rows = await LedgerEntry.aggregate([
    { $match: { status: "approved" } },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
      },
    },
  ]);

  const byType = Object.fromEntries(rows.map((row) => [row._id, row.total]));
  const deposits = byType.deposit || 0;
  const withdrawals = byType.withdrawal || 0;
  const adjustments = byType.adjustment || 0;

  return deposits - withdrawals + adjustments;
}

export function getBalanceImpact(entry) {
  if (entry.status !== "approved") {
    return 0;
  }
  if (entry.type === "deposit") {
    return entry.amount;
  }
  if (entry.type === "withdrawal") {
    return -entry.amount;
  }
  if (entry.type === "adjustment") {
    return entry.amount;
  }
  return 0;
}

export function validateAmountByType(type, amount) {
  if (!Number.isFinite(amount)) {
    return "amount must be a valid number";
  }
  if (type === "deposit" || type === "withdrawal") {
    if (amount <= 0) {
      return "amount must be a positive number";
    }
    return null;
  }
  if (type === "adjustment") {
    if (amount === 0) {
      return "amount must be non-zero";
    }
    return null;
  }
  return "unsupported entry type";
}

export async function createApprovedDeposit({
  amount,
  monthKey,
  note,
  memberId,
  requestedBy,
  approvedBy,
  source,
}) {
  const now = new Date();

  return LedgerEntry.create({
    type: "deposit",
    status: "approved",
    amount,
    monthKey,
    note,
    source,
    requestedAt: now,
    approvedAt: now,
    member: memberId || null,
    requestedBy,
    approvedBy,
  });
}

export function buildSummaryRows(users, entries, monthKeys) {
  const rowMap = new Map();

  for (const user of users) {
    const fee = Number(user.monthlyFee || 0);
    const initialMonths = Object.fromEntries(
      monthKeys.map((key) => [
        key,
        {
          amount: 0,
          approvedCount: 0,
          dueAmount: fee,
          remainingAmount: fee,
          pendingAmount: 0,
          forceZeroPaid: false,
          status: "unpaid",
          requestedAt: null,
          approvedAt: null,
        },
      ])
    );

    rowMap.set(String(user._id), {
      userId: user.id,
      userName: user.name,
      monthlyFee: fee,
      isDonation: false,
      months: initialMonths,
    });
  }

  const donationMonths = Object.fromEntries(
    monthKeys.map((key) => [
      key,
      {
        amount: 0,
        approvedCount: 0,
        dueAmount: 0,
        remainingAmount: 0,
        pendingAmount: 0,
        forceZeroPaid: false,
        status: "donation",
        requestedAt: null,
        approvedAt: null,
      },
    ])
  );

  const donationRow = {
    userId: DONATION_ROW_ID,
    userName: "찬조금",
    monthlyFee: 0,
    isDonation: true,
    months: donationMonths,
  };

  for (const entry of entries) {
    if (!entry.monthKey) {
      continue;
    }

    if (entry.source === DONATION_SOURCE) {
      const donationCell = donationRow.months[entry.monthKey];
      if (!donationCell) {
        continue;
      }

      if (entry.status === "approved") {
        donationCell.amount += entry.amount;
        donationCell.approvedCount += 1;
        donationCell.approvedAt = entry.approvedAt || donationCell.approvedAt;
      }

      if (entry.status === "pending") {
        donationCell.pendingAmount += entry.amount;
      }

      if (entry.requestedAt && (!donationCell.requestedAt || entry.requestedAt > donationCell.requestedAt)) {
        donationCell.requestedAt = entry.requestedAt;
      }
      continue;
    }

    const memberId = entry.member ? String(entry.member) : null;
    if (!memberId || !rowMap.has(memberId)) {
      continue;
    }

    const row = rowMap.get(memberId);
    const cell = row.months[entry.monthKey];
    if (!cell) {
      continue;
    }

    if (entry.status === "approved") {
      cell.amount += entry.amount;
      cell.approvedCount += 1;
      cell.approvedAt = entry.approvedAt || cell.approvedAt;
      if (entry.source === "admin_force_zero") {
        cell.forceZeroPaid = true;
      }
    }

    if (entry.status === "pending") {
      cell.pendingAmount += entry.amount;
    }

    if (entry.requestedAt && (!cell.requestedAt || entry.requestedAt > cell.requestedAt)) {
      cell.requestedAt = entry.requestedAt;
    }
  }

  for (const row of rowMap.values()) {
    for (const monthKey of monthKeys) {
      const cell = row.months[monthKey];
      cell.remainingAmount = Math.max((cell.dueAmount || 0) - (cell.amount || 0), 0);

      if (cell.forceZeroPaid) {
        cell.status = "paid";
        continue;
      }

      if (cell.dueAmount === 0) {
        if (cell.approvedCount > 0) {
          cell.status = "paid";
        } else if (cell.pendingAmount > 0) {
          cell.status = "pending";
        } else {
          cell.status = "unpaid";
        }
        continue;
      }

      const fullyPaid = cell.amount >= cell.dueAmount;
      if (fullyPaid) {
        cell.status = "paid";
      } else if (cell.amount > 0) {
        cell.status = "partial";
      } else if (cell.pendingAmount > 0) {
        cell.status = "pending";
      } else {
        cell.status = "unpaid";
      }
    }
  }

  return [...Array.from(rowMap.values()), donationRow];
}

export async function fetchTransactionsWithBalance(limit) {
  const recentEntries = await LedgerEntry.find({ source: { $ne: "admin_force_zero" } })
    .sort({ requestedAt: -1, _id: -1 })
    .limit(limit)
    .populate("member", "name")
    .populate("requestedBy", "name")
    .populate("approvedBy", "name");

  if (recentEntries.length === 0) {
    return [];
  }

  const earliestInSet = recentEntries[recentEntries.length - 1];
  const beforeRows = await LedgerEntry.aggregate([
    {
      $match: {
        status: "approved",
        requestedAt: { $lt: earliestInSet.requestedAt },
      },
    },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
      },
    },
  ]);

  const beforeByType = Object.fromEntries(beforeRows.map((row) => [row._id, row.total]));
  let runningBalance =
    (beforeByType.deposit || 0) - (beforeByType.withdrawal || 0) + (beforeByType.adjustment || 0);

  const ascEntries = [...recentEntries].sort((a, b) => {
    const timeDiff = new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime();
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return String(a._id).localeCompare(String(b._id));
  });

  const balanceAfterById = new Map();
  for (const entry of ascEntries) {
    runningBalance += getBalanceImpact(entry);
    balanceAfterById.set(String(entry._id), runningBalance);
  }

  return recentEntries.map((entry) => ({
    id: entry.id,
    type: entry.type,
    status: entry.status,
    amount: entry.amount,
    monthKey: entry.monthKey,
    note: entry.note,
    source: entry.source || null,
    requestedAt: entry.requestedAt,
    approvedAt: entry.approvedAt,
    memberName: entry.member?.name || null,
    requestedByName: entry.requestedBy?.name || null,
    approvedByName: entry.approvedBy?.name || null,
    balanceAfter: balanceAfterById.get(String(entry._id)) ?? null,
  }));
}

export async function fetchMonthlyTotalsForYear(selectedYear, monthKeys) {
  const start = new Date(selectedYear, 0, 1);
  const end = new Date(selectedYear + 1, 0, 1);

  const entries = await LedgerEntry.find({
    status: "approved",
    requestedAt: { $gte: start, $lt: end },
  }).select("type amount requestedAt");

  const totalsByMonth = Object.fromEntries(
    monthKeys.map((monthKey) => [
      monthKey,
      {
        monthKey,
        income: 0,
        expense: 0,
        net: 0,
      },
    ])
  );

  for (const entry of entries) {
    const at = new Date(entry.requestedAt);
    if (Number.isNaN(at.getTime())) {
      continue;
    }

    const monthKey = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}`;
    const row = totalsByMonth[monthKey];
    if (!row) {
      continue;
    }

    if (entry.type === "deposit") {
      row.income += entry.amount;
      continue;
    }

    if (entry.type === "withdrawal") {
      row.expense += entry.amount;
      continue;
    }

    if (entry.type === "adjustment") {
      if (entry.amount >= 0) {
        row.income += entry.amount;
      } else {
        row.expense += Math.abs(entry.amount);
      }
    }
  }

  return monthKeys.map((monthKey) => {
    const row = totalsByMonth[monthKey];
    row.net = row.income - row.expense;
    return row;
  });
}
