import bcrypt from "bcryptjs";
import { config } from "./config.js";
import { User } from "./models/User.js";

export async function ensureAdminUser() {
  const existing = await User.findOne({ name: config.adminName });
  if (existing) {
    return;
  }

  const passwordHash = await bcrypt.hash(config.adminPassword, 10);
  await User.create({
    name: config.adminName,
    passwordHash,
    role: "admin",
  });

  // eslint-disable-next-line no-console
  console.log(`Seeded admin account: ${config.adminName}`);
}
