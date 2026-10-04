import "server-only";
import { createClient, type Client } from "@libsql/client";

// Local dev: a SQLite file next to package.json. Vercel: Turso (hosted SQLite), because
// Vercel's filesystem is read-only and ephemeral.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS attempts (
  id             TEXT PRIMARY KEY,
  mode           TEXT NOT NULL,        -- 'subject' | 'topic'
  units          TEXT NOT NULL,        -- JSON array of unit numbers
  topic          TEXT,                 -- topic mode: JSON array of sub-topic ids (older rows: one id); NULL = whole unit
  setup          TEXT NOT NULL,
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

let client: Client | null = null;
let ready: Promise<void> | null = null;

export async function db(): Promise<Client> {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL ?? (process.env.VERCEL ? undefined : "file:local.db");
    if (!url) throw new Error("TURSO_DATABASE_URL is not set. Add it (and TURSO_AUTH_TOKEN) in Vercel → Settings → Environment Variables.");
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
    ready = client.executeMultiple(SCHEMA).catch((e) => {
      client = null; // retry on the next request
      throw e;
    });
  }
  await ready;
  return client;
}
