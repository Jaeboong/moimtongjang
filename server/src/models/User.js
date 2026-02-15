import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    passwordEncrypted: { type: String, default: null },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    monthlyFee: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
