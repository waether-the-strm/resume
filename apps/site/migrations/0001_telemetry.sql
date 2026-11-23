-- Temporary testing notes and reading events. Applied once a real D1 database
-- is bound as TELEMETRY_DB. Until then the Worker logs the validated JSON.

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  event TEXT NOT NULL,
  session_id TEXT NOT NULL,
  payload TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS events_session ON events (session_id, received_at);
