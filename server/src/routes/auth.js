import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Router } from "express";
import { config } from "../config.js";
import { authRequired } from "../middleware/auth.js";
import { User } from "../models/User.js";

const router = Router();

router.post("/login", async (req, res) => {
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
});

router.get("/me", authRequired, async (req, res) => {
  const user = await User.findById(req.auth.userId).select("_id name role");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({
    id: user.id,
    name: user.name,
    role: user.role,
  });
});

export default router;
