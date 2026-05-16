const crypto = require("crypto");
const IssuedSecret = require("../models/IssuedSecret");

async function issueSecret({ service, expiresInSeconds, scopes }) {
  const rawSecret = crypto.randomBytes(32).toString("hex");
  const secretHash = crypto.createHash("sha256").update(rawSecret).digest("hex");
  const expirySeconds = Number(expiresInSeconds || 3600);
  const expiresAt = new Date(Date.now() + expirySeconds * 1000);

  const record = await IssuedSecret.create({
    service,
    secret_hash: secretHash,
    expires_at: expiresAt,
    issued_at: new Date(),
    scopes: Array.isArray(scopes) ? scopes : []
  });

  return {
    id: String(record._id),
    service: record.service,
    secret: rawSecret,
    expires_at: record.expires_at,
    issued_at: record.issued_at,
    scopes: record.scopes
  };
}

async function countActiveSecrets() {
  return IssuedSecret.countDocuments({
    expires_at: { $gt: new Date() }
  });
}

module.exports = {
  issueSecret,
  countActiveSecrets
};
