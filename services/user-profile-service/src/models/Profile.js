const db = require('../config/database');

const Profile = {
  async findById(userId) {
    const { rows } = await db.query(
      'SELECT user_id, phone, city, bio, updated_at FROM profiles WHERE user_id = $1',
      [userId]
    );
    return rows[0] || null;
  },

  async upsert(userId, { phone, city, bio }) {
    const { rows } = await db.query(
      `INSERT INTO profiles (user_id, phone, city, bio, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET phone      = EXCLUDED.phone,
             city       = EXCLUDED.city,
             bio        = EXCLUDED.bio,
             updated_at = NOW()
       RETURNING user_id, phone, city, bio, updated_at`,
      [userId, phone ?? null, city ?? null, bio ?? null]
    );
    return rows[0];
  },
};

module.exports = Profile;
