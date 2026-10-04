# Question bank authoring guide

The bank lives in `src/data/questions/unit-XX.json` (one file per syllabus unit, `XX` = 01..10).
Questions follow the exam-question-paper skill in `../.claude/` (SKILL.md, question-types.md, RULES.md) —
same five types, same stem/option conventions — stored as data instead of HTML.

Exam: UGC NET / JRF **Commerce (code 08), Paper 2**. Units and sub-topic ids: `src/lib/syllabus.ts`.

## Format

Each file is a JSON array of objects matching `Question` in `src/lib/types.ts`:

| field | notes |
|---|---|
| `id` | `u07-001`, `u07-002`, … unique, zero-padded, unit prefix matches file |
| `unit` | number, matches file |
| `topic` | a sub-topic id of that unit from `syllabus.ts`, e.g. `u07-t03` |
| `type` | `mcq` · `ar` · `statements` · `matching` · `sequencing` |
| `stem` | question text, no `Q1.` prefix. AR: `"Assertion (A): …"` |
| `reason` | AR only: `"Reason (R): …"` |
| `items` | statements / sequencing: array of strings, rendered as 1, 2, 3… (no numbers in the text) |
| `listI`, `listII` | matching: arrays, rendered as A, B, C, D and 1, 2, 3, 4 (no prefixes in the text) |
| `prompt` | line after the list: `"Choose the correct option:"`, `"Which of the above statements are correct?"`, `"Choose the correct code:"`, `"Choose the correct sequence:"` |
| `options` | exactly 4 strings, no `a)` prefix |
| `answer` | `"a"`–`"d"` |
| `code` | matching/sequencing only: identical to the text of the correct option, e.g. `"A-2, B-1, C-4, D-3"` or `"2-1-3-4"` |
| `explanation` | 1–3 sentences: why the answer is right (and, where useful, why a tempting option is wrong) |

AR options are always the standard four, verbatim:
1. `Both A and R are true and R is the correct explanation of A`
2. `Both A and R are true but R is not the correct explanation of A`
3. `A is true but R is false`
4. `A is false but R is true`

## Quality rules

- Exactly one defensibly correct answer. Distractors plausible, same length/style as the answer.
- Spread questions over **every** sub-topic of the unit.
- Balance correct letters roughly evenly across a/b/c/d.
- UGC NET level: conceptual understanding, standard textbook facts, simple numericals (show the working in the explanation).
- Original wording; no verbatim copying from textbooks or past papers.
- Avoid facts that change often (current rates, thresholds, office-holders). If a question depends on a law or year, name it in the stem.
  Income tax: India's Income-tax Act, 2025 replaced the 1961 Act from 1 April 2026 — prefer concept questions that hold under both; never rely on section numbers alone.
- AR: decide A true/false, R true/false, and whether R *actually explains* A — being true and related is not enough for option a.

## Validate

```bash
node scripts/validate-bank.ts            # all files
node scripts/validate-bank.ts unit-03.json
```
Fix every ✗ before finishing. The summary lines show type, answer-letter and topic spread.
