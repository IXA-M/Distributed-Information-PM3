const db = require('../config/database');
const crypto = require('crypto');

const RefreshToken = {
  /** Hash a raw token before storing */
  hash(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  },

  async save({ userId, token, expiresAt }) {
    const tokenHash = this.hash(token);
    const { rows } = await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3) RETURNING id`,
      [userId, tokenHash, expiresAt]
    );
    return rows[0];
  },

  async findByToken(token) {
    const tokenHash = this.hash(token);
    const { rows } = await db.query(
      `SELECT * FROM refresh_tokens
       WHERE token_hash = $1 AND expires_at > NOW()`,
      [tokenHash]
    );
    return rows[0] || null;
  },

  async deleteByToken(token) {
    const tokenHash = this.hash(token);
    await db.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
  },

  async deleteAllForUser(userId) {
    await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
  },
};

module.exports = RefreshToken;
