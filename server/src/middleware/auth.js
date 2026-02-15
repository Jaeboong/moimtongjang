import jwt from "jsonwebtoken";
import { config } from "../config.js";

export function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.auth = {
      userId: payload.sub,
      name: payload.name,
      role: payload.role,
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function requireRole(role) {
  return function roleMiddleware(req, res, next) {
    if (!req.auth || req.auth.role !== role) {
      return res.status(403).json({ message: "Forbidden" });
    }
    return next();
  };
}
