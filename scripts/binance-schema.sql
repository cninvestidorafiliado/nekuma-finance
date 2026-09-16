CREATE TABLE IF NOT EXISTS binance_connections (
  user_id TEXT PRIMARY KEY,
  iv TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  snapshot TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  attempted_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS binance_connect_attempts (
  user_id TEXT PRIMARY KEY,
  attempted_at INTEGER NOT NULL
);
