import crypto from "crypto";

function getKey(secret) {
  return crypto.createHash("sha256").update(String(secret || "")).digest();
}

export function encryptPasswordForView(plainPassword, secret) {
  if (!plainPassword) {
    return null;
  }

  const key = getKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainPassword), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptPasswordForView(payload, secret) {
  if (!payload) {
    return null;
  }

  const parts = String(payload).split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const [ivEncoded, tagEncoded, encryptedEncoded] = parts;
    const key = getKey(secret);
    const iv = Buffer.from(ivEncoded, "base64url");
    const tag = Buffer.from(tagEncoded, "base64url");
    const encrypted = Buffer.from(encryptedEncoded, "base64url");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}
