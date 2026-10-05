// Which database the app talks to. Kept free of server-only imports so it can be unit tested.
//
// Why production does NOT use TURSO_DATABASE_URL: the Vercel Turso integration gives every
// deployment its own branch (dpl-<deployment id>), forked from the main database at deploy time.
// Using it in production means each deploy starts with whatever main held — history appears to reset.
// So production uses APP_DB_URL / APP_DB_TOKEN, which point at the main database permanently.

export interface DbConfig {
  url: string;
  authToken?: string;
}

type Env = Record<string, string | undefined>;

export function resolveDbConfig(env: Env): DbConfig {
  // Production on Vercel: the fixed main database, never a per-deployment branch.
  if (env.VERCEL_ENV === "production") {
    const url = env.APP_DB_URL;
    if (!url || !env.APP_DB_TOKEN)
      throw new Error(
        "APP_DB_URL and APP_DB_TOKEN must be set for Production in Vercel → Settings → Environment Variables " +
          "(the main Turso database, not the per-deployment TURSO_DATABASE_URL).",
      );
    if (isDeploymentBranch(url))
      throw new Error(`APP_DB_URL points at a per-deployment branch (${hostOf(url)}); use the main database.`);
    return { url, authToken: env.APP_DB_TOKEN };
  }

  // Explicit override anywhere else (e.g. testing against the main database locally).
  if (env.APP_DB_URL) return { url: env.APP_DB_URL, authToken: env.APP_DB_TOKEN };

  // Preview / development deployments: their own throwaway branch, so test data never reaches her history.
  if (env.VERCEL) {
    if (!env.TURSO_DATABASE_URL) throw new Error("TURSO_DATABASE_URL is not set for this Vercel environment.");
    return { url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN };
  }

  // Local machine: a SQLite file (tests may point TURSO_DATABASE_URL at their own file).
  return { url: env.TURSO_DATABASE_URL ?? "file:local.db", authToken: env.TURSO_AUTH_TOKEN };
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Branches made by the Vercel integration are named dpl-<deployment id>. */
export function isDeploymentBranch(url: string): boolean {
  return hostOf(url).startsWith("dpl-");
}
