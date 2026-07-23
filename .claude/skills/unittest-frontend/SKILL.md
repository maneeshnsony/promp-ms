---
name: unittest-frontend
description: Drives the frontend dashboard MVP end-to-end with Playwright (dashboard load, create with category/role, copy-to-clipboard + copy_count, edit preserving categories + version snapshot, pagination, dark theme) and reports pass/fail. Use when the user asks to run frontend tests, verify the dashboard, or check the frontend against the backend.
---

# Unit Test — Frontend

A Vitest + React Testing Library unit/component suite is committed (`frontend/vitest.config.ts`,
run via `npm test` from `frontend/`; see `docs/TODO.md`'s Testing checklist) — use that for
component- and function-level checks. This skill is the separate, complementary layer: it
automates the manual browser verification from
`docs/local/PHASE1-FRONTEND-DASHBOARD-PLAN.md`'s "Verification" section using Playwright's
Python client, against a real `next dev` server and the real backend API (full-stack E2E,
not covered by the Vitest suite since that mocks the API layer).

## Instructions

### Step 1: Confirm prerequisites

- The Docker Compose stack must be up: `docker compose ps` should show `api` healthy.
  If not, run `docker compose up -d` first (don't do this automatically — starting
  containers is the user's call).
- `frontend/node_modules` must exist (`npm install` already run).
- The Python `playwright` package and its Chromium browser must be installed once:
  ```
  pip install playwright
  python -m playwright install chromium
  ```
  The script checks for the package and exits with these instructions if missing —
  it does not install anything on its own.

### Step 2: Run the script

From the repo root:

```
python3 .claude/skills/unittest-frontend/scripts/run_verification.py
```

This script, for the duration of the run only:
- Recreates the `api` compose service with `SKIP_AUTH=true` (a subprocess environment
  variable only — `backend/.env` is never edited), then recreates it again with no
  override afterward so it falls back to the real `.env` value. If the script crashes,
  the `finally` block still runs this revert.
- Starts `next dev` on scratch port `3101` (so it doesn't collide with the `web`
  compose service on `3000`) and kills it on exit.
- Creates prompts titled with the `unittest-frontend verification` prefix and deletes
  every prompt matching that prefix during cleanup (soft-deleted, per the backend's
  contract — rows remain with `deleted_at` set, same as any other delete).

### Step 3: Read the result

Each scenario prints `[PASS]`/`[FAIL]` as it runs, followed by a `SUMMARY`/`RESULT`
block. Exit codes:
- `0` — every scenario passed.
- `1` — one or more scenarios failed; failure details are re-printed at the end.
- `2` — a setup problem (backend unreachable, `playwright` not installed).

### Step 4: Report to the user

State pass/fail explicitly and, for any failure, quote the detail message — it names
the scenario and what was expected vs. observed (e.g. a stale clipboard value, a
category that got dropped on edit, wrong pagination bounds).
