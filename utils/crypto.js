const crypto = require("crypto");

const algorithm = "aes-256-cbc";

if (!process.env.ENCRYPTION_SECRET) {
  throw new Error("ENCRYPTION_SECRET is not defined in environment variables.");
}

const key = crypto.createHash("sha256").update(process.env.ENCRYPTION_SECRET).digest();
const iv = Buffer.alloc(16, 0); // For demo only; consider random IVs for real security

exports.encrypt = (text) => {
  if (!text) return null;
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  return cipher.update(text, "utf8", "hex") + cipher.final("hex");
};

exports.decrypt = (encrypted) => {
  if (!encrypted) return null;
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  return decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8");
};
