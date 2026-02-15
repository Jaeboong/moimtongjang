import bcrypt from "bcryptjs";
import { Router } from "express";
import { authRequired, requireRole } from "../middleware/auth.js";
import { User } from "../models/User.js";

const router = Router();

router.get("/", authRequired, async (_req, res) => {
  const users = await User.find().select("_id name role createdAt").sort({ name: 1 });
  return res.json(
    users.map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    }))
  );
});

router.post("/", authRequired, requireRole("admin"), async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const password = String(req.body?.password || "");
  const role = req.body?.role === "admin" ? "admin" : "user";

  if (!name || !password) {
    return res.status(400).json({ message: "name and password are required" });
  }

  const existing = await User.findOne({ name });
  if (existing) {
    return res.status(409).json({ message: "name already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    passwordHash,
    role,
  });

  return res.status(201).json({
    id: user.id,
    name: user.name,
    role: user.role,
  });
});

export default router;
