import mongoose from "mongoose";
import { LedgerEntry } from "../models/LedgerEntry.js";
import { User } from "../models/User.js";
import {
  buildSummaryRows,
  calculateBalance,
  createApprovedDeposit,
  fetchMonthlyTotalsForYear,
  fetchTransactionsWithBalance,
  makeYearMonthKeys,
  monthKeyValid,
  resolveSummaryYear,
  validateAmountByType,
} from "../services/ledgerService.js";

const DONATION_TARGET_ID = "donation";

export async function getSummary(req, res) {
  const { selectedYear, availableYears } = resolveSummaryYear(req.query.year);
  const monthKeys = makeYearMonthKeys(selectedYear);

  const users = await User.find({ role: "user" }).select("_id name monthlyFee").sort({ name: 1 });
  const entries = await LedgerEntry.find({
    type: "deposit",
    monthKey: { $in: monthKeys },
  }).select("member monthKey amount status source requestedAt approvedAt");

  return res.json({
    selectedYear,
    availableYears,
    monthKeys,
    rows: buildSummaryRows(users, entries, monthKeys),
  });
}

export async function getTransactions(req, res) {
  const limit = Math.min(Math.max(Number(req.query.limit || 150), 1), 500);
  const rows = await fetchTransactionsWithBalance(limit);
  return res.json(rows);
}

export async function getMonthlyTotals(req, res) {
  const { selectedYear, availableYears } = resolveSummaryYear(req.query.year);
  const monthKeys = makeYearMonthKeys(selectedYear);
  const totals = await fetchMonthlyTotalsForYear(selectedYear, monthKeys);

  return res.json({
    selectedYear,
    availableYears,
    monthKeys,
    totals,
  });
}

export async function getBalance(_req, res) {
  const balance = await calculateBalance();
  return res.json({ balance });
}

export async function requestDeposit(req, res) {
  const amount = Number(req.body?.amount || 0);
  const monthKey = String(req.body?.monthKey || "").trim();
  const note = String(req.body?.note || "").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: "amount must be a positive number" });
  }

  if (!monthKeyValid(monthKey)) {
    return res.status(400).json({ message: "monthKey must be YYYY-MM" });
  }

  const member = await User.findById(req.auth.userId).select("_id");
  if (!member) {
    return res.status(404).json({ message: "User not found" });
  }

  const entry = await LedgerEntry.create({
    type: "deposit",
    status: "pending",
    amount,
    monthKey,
    note,
    source: "user_request",
    requestedAt: new Date(),
    member: member._id,
    requestedBy: member._id,
  });

  return res.status(201).json({ id: entry.id });
}

export async function adminDeposit(req, res) {
  const amount = Number(req.body?.amount || 0);
  const monthKeyRaw = req.body?.monthKey;
  const monthKey = monthKeyRaw ? String(monthKeyRaw).trim() : null;
  const note = String(req.body?.note || "").trim();
  const memberIdRaw = req.body?.memberId;
  const memberId = memberIdRaw ? String(memberIdRaw).trim() : null;
  const isDonationTarget = memberId === DONATION_TARGET_ID;

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: "amount must be a positive number" });
  }

  if (monthKey && !monthKeyValid(monthKey)) {
    return res.status(400).json({ message: "monthKey must be YYYY-MM" });
  }

  let member = null;
  if (memberId && !isDonationTarget) {
    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ message: "Invalid memberId" });
    }

    member = await User.findById(memberId).select("_id");
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }
  }

  const entry = await createApprovedDeposit({
    amount,
    monthKey,
    note,
    memberId: isDonationTarget ? null : member?._id || null,
    requestedBy: req.auth.userId,
    approvedBy: req.auth.userId,
    source: isDonationTarget ? "admin_sponsorship" : "admin_direct",
  });

  return res.status(201).json({ id: entry.id });
}

export async function forcePaid(req, res) {
  const memberId = String(req.body?.memberId || "").trim();
  const monthKey = String(req.body?.monthKey || "").trim();
  const note = String(req.body?.note || "").trim();

  if (!mongoose.Types.ObjectId.isValid(memberId)) {
    return res.status(400).json({ message: "Invalid memberId" });
  }

  if (!monthKeyValid(monthKey)) {
    return res.status(400).json({ message: "monthKey must be YYYY-MM" });
  }

  const member = await User.findById(memberId).select("_id monthlyFee");
  if (!member) {
    return res.status(404).json({ message: "Member not found" });
  }

  const monthlyFee = Number(member.monthlyFee || 0);
  if (!Number.isFinite(monthlyFee) || monthlyFee < 0) {
    return res.status(400).json({ message: "Invalid member monthlyFee" });
  }

  if (monthlyFee === 0) {
    return res.status(400).json({ message: "월 회비가 설정되지 않은 회원입니다. 먼저 월 회비를 설정해주세요." });
  }

  const approvedRow = await LedgerEntry.aggregate([
    {
      $match: {
        type: "deposit",
        status: "approved",
        member: member._id,
        monthKey,
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);

  const approvedAmount = approvedRow[0]?.total || 0;
  const approvedCount = approvedRow[0]?.count || 0;

  let amountToAdd = 0;
  if (monthlyFee === 0) {
    if (approvedCount > 0) {
      return res.status(409).json({ message: "This month is already paid for the member" });
    }
    amountToAdd = 0;
  } else {
    if (approvedAmount >= monthlyFee) {
      return res.status(409).json({ message: "This month is already paid for the member" });
    }
    amountToAdd = monthlyFee - approvedAmount;
  }

  const entry = await createApprovedDeposit({
    amount: amountToAdd,
    monthKey,
    note: note || "관리자 강제 완납 처리",
    memberId: member._id,
    requestedBy: req.auth.userId,
    approvedBy: req.auth.userId,
    source: "admin_force_paid",
  });

  await LedgerEntry.updateMany(
    {
      _id: { $ne: entry._id },
      type: "deposit",
      status: "pending",
      member: member._id,
      monthKey,
    },
    {
      $set: {
        status: "rejected",
        approvedAt: new Date(),
        approvedBy: req.auth.userId,
      },
    }
  );

  return res.status(201).json({ id: entry.id, amount: amountToAdd });
}

export async function forceUnpaid(req, res) {
  const memberId = String(req.body?.memberId || "").trim();
  const monthKey = String(req.body?.monthKey || "").trim();

  if (!mongoose.Types.ObjectId.isValid(memberId)) {
    return res.status(400).json({ message: "Invalid memberId" });
  }

  if (!monthKeyValid(monthKey)) {
    return res.status(400).json({ message: "monthKey must be YYYY-MM" });
  }

  const member = await User.findById(memberId).select("_id");
  if (!member) {
    return res.status(404).json({ message: "Member not found" });
  }

  const result = await LedgerEntry.updateMany(
    {
      type: "deposit",
      status: "approved",
      member: member._id,
      monthKey,
    },
    {
      $set: {
        status: "rejected",
        approvedAt: null,
        approvedBy: null,
      },
    }
  );

  return res.json({ updated: result.modifiedCount || 0 });
}

export async function forceZeroPaid(req, res) {
  const memberId = String(req.body?.memberId || "").trim();
  const monthKey = String(req.body?.monthKey || "").trim();

  if (!mongoose.Types.ObjectId.isValid(memberId)) {
    return res.status(400).json({ message: "Invalid memberId" });
  }

  if (!monthKeyValid(monthKey)) {
    return res.status(400).json({ message: "monthKey must be YYYY-MM" });
  }

  const member = await User.findById(memberId).select("_id");
  if (!member) {
    return res.status(404).json({ message: "Member not found" });
  }

  const existing = await LedgerEntry.findOne({
    type: "deposit",
    status: "approved",
    source: "admin_force_zero",
    member: member._id,
    monthKey,
  });

  if (existing) {
    return res.status(409).json({ message: "이미 0원 완납 처리된 월입니다" });
  }

  const now = new Date();
  const entry = await LedgerEntry.create({
    type: "deposit",
    status: "approved",
    amount: 0,
    monthKey,
    note: "0원 완납 처리",
    source: "admin_force_zero",
    requestedAt: now,
    approvedAt: now,
    member: member._id,
    requestedBy: req.auth.userId,
    approvedBy: req.auth.userId,
  });

  await LedgerEntry.updateMany(
    {
      _id: { $ne: entry._id },
      type: "deposit",
      status: "pending",
      member: member._id,
      monthKey,
    },
    {
      $set: {
        status: "rejected",
        approvedAt: new Date(),
        approvedBy: req.auth.userId,
      },
    }
  );

  return res.status(201).json({ id: entry.id });
}

export async function decideDeposit(req, res) {
  const { id } = req.params;
  const action = req.body?.action;

  if (action !== "approve" && action !== "reject") {
    return res.status(400).json({ message: "action must be approve or reject" });
  }

  const entry = await LedgerEntry.findOne({ _id: id, type: "deposit" });
  if (!entry) {
    return res.status(404).json({ message: "deposit request not found" });
  }

  if (entry.status !== "pending") {
    return res.status(409).json({ message: "deposit request already decided" });
  }

  entry.status = action === "approve" ? "approved" : "rejected";
  entry.approvedAt = action === "approve" ? new Date() : null;
  entry.approvedBy = req.auth.userId;
  entry.source = entry.source || "user_request";

  await entry.save();

  return res.json({ id: entry.id, status: entry.status });
}

export async function updateEntry(req, res) {
  const { id } = req.params;
  const nextAmountRaw = req.body?.amount;
  const nextNoteRaw = req.body?.note;
  const nextMonthKeyRaw = req.body?.monthKey;
  const nextStatusRaw = req.body?.status;

  const entry = await LedgerEntry.findById(id);
  if (!entry) {
    return res.status(404).json({ message: "entry not found" });
  }

  if (nextAmountRaw !== undefined) {
    const nextAmount = Number(nextAmountRaw);
    const amountError = validateAmountByType(entry.type, nextAmount);
    if (amountError) {
      return res.status(400).json({ message: amountError });
    }
    entry.amount = nextAmount;
  }

  if (nextNoteRaw !== undefined) {
    entry.note = String(nextNoteRaw || "").trim();
  }

  if (nextMonthKeyRaw !== undefined) {
    if (entry.type !== "deposit") {
      return res.status(400).json({ message: "monthKey can only be changed for deposit entries" });
    }
    const nextMonthKey = String(nextMonthKeyRaw || "").trim();
    if (nextMonthKey && !monthKeyValid(nextMonthKey)) {
      return res.status(400).json({ message: "monthKey must be YYYY-MM" });
    }
    entry.monthKey = nextMonthKey || null;
  }

  if (nextStatusRaw !== undefined) {
    if (entry.type !== "deposit") {
      return res.status(400).json({ message: "status change is only supported for deposit entries" });
    }
    const nextStatus = String(nextStatusRaw);
    if (!["pending", "approved", "rejected"].includes(nextStatus)) {
      return res.status(400).json({ message: "status must be pending, approved, or rejected" });
    }
    entry.status = nextStatus;
    if (nextStatus === "approved") {
      entry.approvedAt = new Date();
      entry.approvedBy = req.auth.userId;
    } else {
      entry.approvedAt = null;
      entry.approvedBy = null;
    }
  }

  await entry.save();
  return res.json({ id: entry.id });
}

export async function deleteEntry(req, res) {
  const { id } = req.params;
  const deleted = await LedgerEntry.findByIdAndDelete(id);
  if (!deleted) {
    return res.status(404).json({ message: "entry not found" });
  }
  return res.status(204).send();
}

export async function createWithdrawal(req, res) {
  const amount = Number(req.body?.amount || 0);
  const note = String(req.body?.note || "").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: "amount must be a positive number" });
  }

  const now = new Date();

  const entry = await LedgerEntry.create({
    type: "withdrawal",
    status: "approved",
    amount,
    note,
    source: "admin_withdrawal",
    requestedAt: now,
    approvedAt: now,
    requestedBy: req.auth.userId,
    approvedBy: req.auth.userId,
  });

  return res.status(201).json({ id: entry.id });
}

export async function createAdjustment(req, res) {
  const amount = Number(req.body?.amount || 0);
  const note = String(req.body?.note || "").trim();

  if (!Number.isFinite(amount) || amount === 0) {
    return res.status(400).json({ message: "amount must be non-zero" });
  }

  const now = new Date();

  const entry = await LedgerEntry.create({
    type: "adjustment",
    status: "approved",
    amount,
    note,
    source: "admin_adjustment",
    requestedAt: now,
    approvedAt: now,
    requestedBy: req.auth.userId,
    approvedBy: req.auth.userId,
  });

  return res.status(201).json({ id: entry.id });
}
