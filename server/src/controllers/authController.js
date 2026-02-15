import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { User } from "../models/User.js";
import { encryptPasswordForView } from "../security/passwordCipher.js";

export async function login(req, res) {
  const name = String(req.body?.name || "").trim();
  const password = String(req.body?.password || "");

  if (!name || !password) {
    return res.status(400).json({ message: "name and password are required" });
  }

  const user = await User.findOne({ name });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (!user.passwordEncrypted) {
    user.passwordEncrypted = encryptPasswordForView(password, config.passwordViewSecret);
    await user.save();
  }

  const token = jwt.sign(
    {
      sub: user.id,
      name: user.name,
      role: user.role,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
    },
  });
}

export async function me(req, res) {
  const user = await User.findById(req.auth.userId).select("_id name role");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({
    id: user.id,
    name: user.name,
    role: user.role,
  });
}

export async function changePassword(req, res) {
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "currentPassword and newPassword are required" });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ message: "newPassword must be at least 4 characters" });
  }

  const user = await User.findById(req.auth.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: "Current password is invalid" });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.passwordEncrypted = encryptPasswordForView(newPassword, config.passwordViewSecret);
  await user.save();

  return res.json({ ok: true });
}
