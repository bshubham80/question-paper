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

Vercel's filesystem is read-only and temporary, so production history lives in Turso (hosted SQLite, free tier).

1. **Create the database** — sign up at https://turso.tech, create a database, then copy:
   - the database URL (`libsql://<name>-<org>.turso.io`)
   - an auth token (Database → *Generate token*)
2. **Push this folder to GitHub** and import the repo at https://vercel.com/new (framework: Next.js, defaults are fine).
3. In Vercel → Project → **Settings → Environment Variables**, add:
   - `TURSO_DATABASE_URL` = the URL
   - `TURSO_AUTH_TOKEN` = the token
4. Deploy. Tables are created automatically on the first request.

To use the Turso database locally as well, put the same two variables in `.env.local`.

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
