import bcrypt from "bcryptjs";
import { config } from "./config.js";
import { User } from "./models/User.js";
import { encryptPasswordForView } from "./security/passwordCipher.js";

export async function ensureAdminUser() {
  const existing = await User.findOne({ name: config.adminName });
  if (existing) {
    if (!existing.passwordEncrypted) {
      existing.passwordEncrypted = encryptPasswordForView(config.adminPassword, config.passwordViewSecret);
      await existing.save();
    }
    return;
  }

  const passwordHash = await bcrypt.hash(config.adminPassword, 10);
  await User.create({
    name: config.adminName,
    passwordHash,
    passwordEncrypted: encryptPasswordForView(config.adminPassword, config.passwordViewSecret),
    role: "admin",
  });

  // eslint-disable-next-line no-console
  console.log(`Seeded admin account: ${config.adminName}`);
}
