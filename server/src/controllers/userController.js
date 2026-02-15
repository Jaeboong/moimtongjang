import bcrypt from "bcryptjs";
import { config } from "../config.js";
import { User } from "../models/User.js";
import { decryptPasswordForView, encryptPasswordForView } from "../security/passwordCipher.js";

export async function listUsers(req, res) {
  const users = await User.find().select("_id name role monthlyFee passwordEncrypted createdAt").sort({ name: 1 });
  const includePassword = req.auth?.role === "admin";

  return res.json(
    users.map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      monthlyFee: user.monthlyFee || 0,
      passwordView: includePassword
        ? decryptPasswordForView(user.passwordEncrypted, config.passwordViewSecret)
        : undefined,
      createdAt: user.createdAt,
    }))
  );
}

export async function createUser(req, res) {
  const name = String(req.body?.name || "").trim();
  const password = String(req.body?.password || "");
  const role = req.body?.role === "admin" ? "admin" : "user";
  const monthlyFee = Number(req.body?.monthlyFee || 0);

  if (!name || !password) {
    return res.status(400).json({ message: "name and password are required" });
  }

  if (!Number.isFinite(monthlyFee) || monthlyFee < 0) {
    return res.status(400).json({ message: "monthlyFee must be 0 or a positive number" });
  }

  const existing = await User.findOne({ name });
  if (existing) {
    return res.status(409).json({ message: "name already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    passwordHash,
    passwordEncrypted: encryptPasswordForView(password, config.passwordViewSecret),
    role,
    monthlyFee,
  });

  return res.status(201).json({
    id: user.id,
    name: user.name,
    role: user.role,
    monthlyFee: user.monthlyFee || 0,
  });
}

export async function updateMonthlyFee(req, res) {
  const { id } = req.params;
  const monthlyFee = Number(req.body?.monthlyFee);

  if (!Number.isFinite(monthlyFee) || monthlyFee < 0) {
    return res.status(400).json({ message: "monthlyFee must be 0 or a positive number" });
  }

  const user = await User.findById(id).select("_id name role monthlyFee");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.role !== "user") {
    return res.status(400).json({ message: "monthlyFee can only be set for user accounts" });
  }

  user.monthlyFee = monthlyFee;
  await user.save();

  return res.json({
    id: user.id,
    name: user.name,
    monthlyFee: user.monthlyFee,
  });
}
