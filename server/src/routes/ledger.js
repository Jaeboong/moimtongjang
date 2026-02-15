import { Router } from "express";
import { authRequired, requireRole } from "../middleware/auth.js";
import { LedgerEntry } from "../models/LedgerEntry.js";
import { User } from "../models/User.js";

const router = Router();

function monthKeyValid(monthKey) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey);
}

function makeRecentMonthKeys(total) {
  const out = [];
  const date = new Date();

  for (let i = 0; i < total; i += 1) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    out.push(`${year}-${month}`);
    date.setMonth(date.getMonth() - 1);
  }

  return out;
}

async function calculateBalance() {
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

router.get("/summary", authRequired, async (req, res) => {
  const months = Math.min(Math.max(Number(req.query.months || 6), 1), 12);
  const monthKeys = makeRecentMonthKeys(months);

  const users = await User.find({ role: "user" }).select("_id name").sort({ name: 1 });
  const entries = await LedgerEntry.find({
    type: "deposit",
    monthKey: { $in: monthKeys },
  }).select("member monthKey amount status requestedAt approvedAt");

  const rowMap = new Map();

  for (const user of users) {
    const initialMonths = Object.fromEntries(
      monthKeys.map((key) => [
        key,
        {
          amount: 0,
          pendingAmount: 0,
          status: "unpaid",
          requestedAt: null,
          approvedAt: null,
        },
      ])
    );

    rowMap.set(String(user._id), {
      userId: user.id,
      userName: user.name,
      months: initialMonths,
    });
  }

  for (const entry of entries) {
    const memberId = entry.member ? String(entry.member) : null;
    if (!memberId || !rowMap.has(memberId) || !entry.monthKey) {
      continue;
    }

    const cell = rowMap.get(memberId).months[entry.monthKey];
    if (!cell) {
      continue;
    }

    if (entry.status === "approved") {
      cell.amount += entry.amount;
      cell.status = "paid";
      cell.approvedAt = entry.approvedAt || cell.approvedAt;
    }

    if (entry.status === "pending") {
      cell.pendingAmount += entry.amount;
      if (cell.status !== "paid") {
        cell.status = "pending";
      }
    }

    if (entry.requestedAt && (!cell.requestedAt || entry.requestedAt > cell.requestedAt)) {
      cell.requestedAt = entry.requestedAt;
    }
  }

  return res.json({
    monthKeys,
    rows: Array.from(rowMap.values()),
  });
});

router.get("/transactions", authRequired, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit || 150), 1), 500);

  const entries = await LedgerEntry.find()
    .sort({ requestedAt: -1 })
    .limit(limit)
    .populate("member", "name")
    .populate("requestedBy", "name")
    .populate("approvedBy", "name");

  return res.json(
    entries.map((entry) => ({
      id: entry.id,
      type: entry.type,
      status: entry.status,
      amount: entry.amount,
      monthKey: entry.monthKey,
      note: entry.note,
      requestedAt: entry.requestedAt,
      approvedAt: entry.approvedAt,
      memberName: entry.member?.name || null,
      requestedByName: entry.requestedBy?.name || null,
      approvedByName: entry.approvedBy?.name || null,
    }))
  );
});

router.get("/balance", authRequired, async (_req, res) => {
  const balance = await calculateBalance();
  return res.json({ balance });
});

router.post("/deposits/request", authRequired, async (req, res) => {
  const amount = Number(req.body?.amount || 0);
  const monthKey = String(req.body?.monthKey || "").trim();
  const note = String(req.body?.note || "").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: "amount must be a positive number" });
  }

  if (!monthKeyValid(monthKey)) {
    return res.status(400).json({ message: "monthKey must be YYYY-MM" });
  }

  const member = await User.findById(req.auth.userId).select("_id role");
  if (!member || member.role !== "user") {
    return res.status(403).json({ message: "Only user accounts can request deposits" });
  }

  const entry = await LedgerEntry.create({
    type: "deposit",
    status: "pending",
    amount,
    monthKey,
    note,
    requestedAt: new Date(),
    member: member._id,
    requestedBy: member._id,
  });

  return res.status(201).json({ id: entry.id });
});

router.patch("/deposits/:id/decision", authRequired, requireRole("admin"), async (req, res) => {
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

  await entry.save();

  return res.json({ id: entry.id, status: entry.status });
});

router.post("/withdrawals", authRequired, requireRole("admin"), async (req, res) => {
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
    requestedAt: now,
    approvedAt: now,
    requestedBy: req.auth.userId,
    approvedBy: req.auth.userId,
  });

  return res.status(201).json({ id: entry.id });
});

router.post("/adjustments", authRequired, requireRole("admin"), async (req, res) => {
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
    requestedAt: now,
    approvedAt: now,
    requestedBy: req.auth.userId,
    approvedBy: req.auth.userId,
  });

  return res.status(201).json({ id: entry.id });
});

export default router;
