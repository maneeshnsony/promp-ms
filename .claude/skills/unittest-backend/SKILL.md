---
name: unittest-backend
description: Runs the backend's full PHPUnit unit test suite (backend/tests/unit) and reports a clear pass/fail summary. Use when the user asks to run backend tests, unit tests, PHPUnit, or verify backend changes for this project.
---

# Unit Test — Backend

## Instructions

### Step 1: Run the suite

Run the helper script from the repo root:

```
python3 .claude/skills/unittest-backend/scripts/run_tests.py
```

This invokes `backend/vendor/bin/phpunit` (equivalent to `composer test`, run
directly for predictable output) via `php`, using the project's
`backend/phpunit.dist.xml` config. Tests run against the isolated
`prompt_ms_test` Postgres database (see `backend/phpunit.dist.xml` and
`.claude/CLAUDE.md`) — never the real `prompt_ms` dev database.

If `backend/vendor/bin/phpunit` doesn't exist yet, run `composer install`
inside `backend/` first.

### Step 2: Read the result

The script prints full PHPUnit output followed by a `SUMMARY` and `RESULT`
line, and exits:
- `0` — every test passed. This includes the case where PHPUnit itself exits
  non-zero solely because of the known, pre-existing "No code coverage driver
  available" warning (`failOnWarning=true` in `phpunit.dist.xml` trips on this
  even when all tests are green, since no Xdebug/PCOV is installed locally).
  The script treats that specific warning as harmless and does not report it
  as a failure.
- `1` — one or more tests actually failed or errored. Read the PHPUnit output
  above the summary for the failing test name and assertion message.
- `2` — setup problem (backend directory or `vendor/bin/phpunit` missing).

### Step 3: Report to the user

Summarize: how many tests/assertions ran, whether it passed, and — if it
failed — which test(s) failed and why (quote the relevant assertion message
from the output). Don't just say "tests ran"; state pass/fail explicitly.
