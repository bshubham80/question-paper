import { describe, expect, it } from "vitest";
import { isDeploymentBranch, resolveDbConfig } from "@/lib/db-config";

const MAIN = "libsql://database-lime-basket-vercel-icfg-abc.aws-ap-south-1.turso.io";
const BRANCH = "libsql://dpl-cfelx9bz4ipgcbt5zbpdzq-vercel-icfg-abc.aws-ap-south-1.turso.io";

describe("resolveDbConfig — production on Vercel", () => {
  const prod = { VERCEL: "1", VERCEL_ENV: "production" };

  it("uses the fixed main database from APP_DB_URL / APP_DB_TOKEN", () => {
    expect(resolveDbConfig({ ...prod, APP_DB_URL: MAIN, APP_DB_TOKEN: "app-token" })).toEqual({ url: MAIN, authToken: "app-token" });
  });

  it("ignores the integration's per-deployment TURSO_DATABASE_URL", () => {
    const cfg = resolveDbConfig({ ...prod, APP_DB_URL: MAIN, APP_DB_TOKEN: "app-token", TURSO_DATABASE_URL: BRANCH, TURSO_AUTH_TOKEN: "branch-token" });
    expect(cfg).toEqual({ url: MAIN, authToken: "app-token" });
  });

  it("refuses to start without APP_DB_URL instead of silently using a fresh branch", () => {
    expect(() => resolveDbConfig({ ...prod, TURSO_DATABASE_URL: BRANCH, TURSO_AUTH_TOKEN: "t" })).toThrow(/APP_DB_URL and APP_DB_TOKEN must be set/);
  });

  it("refuses to start without APP_DB_TOKEN", () => {
    expect(() => resolveDbConfig({ ...prod, APP_DB_URL: MAIN })).toThrow(/APP_DB_URL and APP_DB_TOKEN must be set/);
  });

  it("refuses an APP_DB_URL that points at a per-deployment branch", () => {
    expect(() => resolveDbConfig({ ...prod, APP_DB_URL: BRANCH, APP_DB_TOKEN: "t" })).toThrow(/per-deployment branch/);
  });
});

describe("resolveDbConfig — other environments", () => {
  it("preview deployments keep their own branch, so test data stays out of her history", () => {
    expect(resolveDbConfig({ VERCEL: "1", VERCEL_ENV: "preview", TURSO_DATABASE_URL: BRANCH, TURSO_AUTH_TOKEN: "b" })).toEqual({ url: BRANCH, authToken: "b" });
  });

  it("a preview without any database setting fails clearly", () => {
    expect(() => resolveDbConfig({ VERCEL: "1", VERCEL_ENV: "preview" })).toThrow(/TURSO_DATABASE_URL is not set/);
  });

  it("local machine defaults to the local SQLite file", () => {
    expect(resolveDbConfig({})).toEqual({ url: "file:local.db", authToken: undefined });
  });

  it("local machine honours TURSO_DATABASE_URL (used by the browser tests' throwaway file)", () => {
    expect(resolveDbConfig({ TURSO_DATABASE_URL: "file:test-e2e.db" }).url).toBe("file:test-e2e.db");
  });

  it("APP_DB_URL overrides locally, e.g. to inspect the main database", () => {
    expect(resolveDbConfig({ APP_DB_URL: MAIN, APP_DB_TOKEN: "x" })).toEqual({ url: MAIN, authToken: "x" });
  });
});

describe("isDeploymentBranch", () => {
  it.each([
    [BRANCH, true],
    [MAIN, false],
    ["file:local.db", false],
  ])("%s → %s", (url, expected) => expect(isDeploymentBranch(url)).toBe(expected));
});
