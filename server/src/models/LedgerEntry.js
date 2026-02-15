import mongoose from "mongoose";

const ledgerEntrySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["deposit", "withdrawal", "adjustment"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    amount: { type: Number, required: true },
    monthKey: { type: String, default: null },
    note: { type: String, default: "" },
    source: {
      type: String,
      enum: [
        "user_request",
        "admin_direct",
        "admin_sponsorship",
        "admin_force_paid",
        "admin_withdrawal",
        "admin_adjustment",
        "admin_force_zero",
      ],
      default: "user_request",
    },
    requestedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date, default: null },
    member: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

ledgerEntrySchema.index({ type: 1, monthKey: 1 });
ledgerEntrySchema.index({ status: 1, requestedAt: -1 });

export const LedgerEntry = mongoose.model("LedgerEntry", ledgerEntrySchema);
