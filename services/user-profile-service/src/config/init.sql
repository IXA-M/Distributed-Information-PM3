CREATE TABLE IF NOT EXISTS profiles (
  user_id    INT PRIMARY KEY,
  phone      VARCHAR(30),
  city       VARCHAR(100),
  bio        TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
