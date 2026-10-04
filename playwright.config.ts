import { defineConfig, devices } from "@playwright/test";

// By default the tests build the app and serve it on port 3100 with a throwaway database, so they
// never touch real exam history (and can run alongside `npm run dev` — Next allows one dev server
// per folder). Set BASE_URL to test an already-running server instead
// (note: that writes test exams into that server's history).
const PORT = 3100;
const baseURL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        // Fresh database every run; deleted here (not in globalSetup) because the server must not have it open yet.
        command: `rm -f test-e2e.db* && npx next build && npx next start -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 300_000,
        env: { TURSO_DATABASE_URL: "file:test-e2e.db" },
      },
});
