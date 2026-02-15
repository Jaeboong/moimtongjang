import { LedgerEntry } from "../models/LedgerEntry.js";

const START_YEAR = 2025;
const START_MONTH_INDEX = 9; // October (0-based)

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
      months: initialMonths,
    });
  }

  for (const entry of entries) {
    const memberId = entry.member ? String(entry.member) : null;
    if (!memberId || !rowMap.has(memberId) || !entry.monthKey) {
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

  return Array.from(rowMap.values());
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
