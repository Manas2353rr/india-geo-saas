const crypto = require("crypto");

function generateApiKey() {
  const rawKey = "ak_" + crypto.randomBytes(32).toString("hex");
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const prefix = rawKey.substring(0, 12);
  return { key: rawKey, keyHash, prefix };
}

function hashApiKey(rawKey) {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

module.exports = { generateApiKey, hashApiKey };