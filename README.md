# JRF Commerce Practice Portal

Practice exams for UGC NET / JRF **Commerce (code 08), Paper 2**, with a full history of every attempt.

- **Across subjects** or **single topic** exams, built with the rules of the exam-question-paper skill in `../.claude/`
  (Balanced / Assertion-Focused / Analytical type mix, even topic weightage, random order).
- Exam screen styled like the NTA online exam: question palette, mark for review, timer (real-exam pace = 72 s/question), autosave, auto-submit.
- Results with unit/topic and question-type breakdown, answer review with explanations.
- History of every exam: date & time (IST), what was covered, correct / total, % and time taken.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · SQLite via `@libsql/client`
(a local `local.db` file in development, [Turso](https://turso.tech) in production).

The question bank is plain JSON in `src/data/questions/` — see [QUESTION_BANK.md](QUESTION_BANK.md).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. History is stored in `local.db` (created automatically, git-ignored).

## Deploy to Vercel

Vercel's filesystem is read-only and temporary, so history lives in [Turso](https://turso.tech) (hosted SQLite).

**Production must point at one fixed database.** The Vercel Turso integration's `TURSO_DATABASE_URL`
is a *per-deployment branch* (`dpl-<deployment id>`) forked from the main database at deploy time —
using it in production makes history look reset after every deploy. So production reads its own settings:

| Variable (Production only) | Value |
|---|---|
| `APP_DB_URL` | `libsql://database-lime-basket-….turso.io` — the **main** database, never a `dpl-…` branch |
| `APP_DB_TOKEN` | a **read-write**, non-expiring Turso token created for that main database |

If either is missing, or the URL is a `dpl-…` branch, production refuses to start rather than show an empty history
(see `src/lib/db-config.ts`). Preview deployments keep using their throwaway branch, so test data never
reaches real history. Tables are created automatically on the first request.

Deploy from this folder:

```bash
npx vercel deploy --prod
```

## Tests

```bash
npm test            # unit tests (Vitest): exam builder rules + start-exam validation
npm run test:e2e    # browser tests (Playwright) for the New exam page, desktop + mobile
```

The browser tests build the app and serve it on port 3100 with a throwaway `test-e2e.db`, so they don't touch
real history and can run while `npm run dev` is up. First run only: `npx playwright install chromium`.

## Question bank

```bash
npm run validate:bank      # check every unit file
```

Add or edit questions in `src/data/questions/unit-XX.json` following [QUESTION_BANK.md](QUESTION_BANK.md), run the validator, then redeploy.
Question ids are referenced by history — edit questions in place, but don't renumber or reuse ids.
