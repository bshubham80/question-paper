import "server-only";
import { createClient, type Client } from "@libsql/client";
import { resolveDbConfig } from "./db-config";

// Local dev: a SQLite file next to package.json. Vercel: Turso (hosted SQLite), because
// Vercel's filesystem is read-only and ephemeral. Which database: see db-config.ts.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS attempts (
  id             TEXT PRIMARY KEY,
  mode           TEXT NOT NULL,        -- 'subject' | 'topic'
  units          TEXT NOT NULL,        -- JSON array of unit numbers
  topic          TEXT,                 -- topic mode: JSON array of sub-topic ids (older rows: one id); NULL = whole unit
  setup          TEXT NOT NULL,
  kind           TEXT,                 -- 'numerical' | 'non-numerical'; NULL = both
  question_ids   TEXT NOT NULL,        -- JSON array, in exam order
  time_limit_sec INTEGER,              -- NULL = untimed
  started_at     TEXT NOT NULL,        -- ISO 8601 UTC
  submitted_at   TEXT,
  duration_sec   INTEGER,
  total          INTEGER NOT NULL,
  correct        INTEGER,
  wrong          INTEGER,
  unattempted    INTEGER,
  progress       TEXT                  -- JSON autosave while in progress
);
CREATE INDEX IF NOT EXISTS attempts_started ON attempts (started_at DESC);
CREATE TABLE IF NOT EXISTS attempt_answers (
  attempt_id     TEXT NOT NULL REFERENCES attempts (id) ON DELETE CASCADE,
  question_id    TEXT NOT NULL,
  position       INTEGER NOT NULL,
  chosen         TEXT,                 -- 'a'..'d' or NULL
  is_correct     INTEGER NOT NULL,
  time_spent_sec INTEGER NOT NULL DEFAULT 0,
  marked         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (attempt_id, question_id)
);
`;

/** Columns added after the first release; existing databases get them here. */
async function migrate(c: Client): Promise<void> {
  const cols = await c.execute("PRAGMA table_info(attempts)");
  if (!cols.rows.some((r) => r.name === "kind")) await c.execute("ALTER TABLE attempts ADD COLUMN kind TEXT");
}

let client: Client | null = null;
let ready: Promise<void> | null = null;

export async function db(): Promise<Client> {
  if (!client) {
    client = createClient(resolveDbConfig(process.env));
    const c = client;
    ready = c
      .executeMultiple(SCHEMA)
      .then(() => migrate(c))
      .catch((e) => {
        client = null; // retry on the next request
        throw e;
      });
  }
  await ready;
  return client;
}
