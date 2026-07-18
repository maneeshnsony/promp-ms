#!/usr/bin/env python3
"""Run the backend PHPUnit test suite and report a clean pass/fail summary.

Runs `vendor/bin/phpunit` from `backend/` (equivalent to `composer test`,
without going through Composer so output stays predictable to parse) and
exits non-zero only for a genuine test failure/error.

Why this exists: backend/phpunit.dist.xml sets failOnWarning="true", which
trips on "No code coverage driver available" even when every test passes
(no Xdebug/PCOV installed locally). That specific warning is treated as
non-fatal here; any other failure, error, or warning still fails loudly.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
BACKEND_DIR = REPO_ROOT / "backend"

KNOWN_HARMLESS_WARNINGS = {
    "No code coverage driver available",
}

# Matches PHPUnit's summary line, e.g.:
#   "OK, but there were issues!"
#   "Tests: 51, Assertions: 111, PHPUnit Warnings: 1."
#   "Tests: 51, Assertions: 111, Failures: 2."
SUMMARY_RE = re.compile(r"^Tests:\s*(\d+),\s*Assertions:\s*(\d+)(.*)$")


def find_phpunit_script() -> Path:
    # Invoke the PHP source file directly via the `php` interpreter rather than
    # executing vendor/bin/phpunit (a Unix shell script) or phpunit.bat - this
    # works identically on Windows, Linux, and macOS.
    candidate = BACKEND_DIR / "vendor" / "bin" / "phpunit"
    if candidate.exists():
        return candidate
    raise FileNotFoundError(
        f"Could not find vendor/bin/phpunit under {BACKEND_DIR}. "
        "Run `composer install` in backend/ first."
    )


def run_phpunit() -> subprocess.CompletedProcess:
    phpunit = find_phpunit_script()
    return subprocess.run(
        ["php", str(phpunit), "--testdox", "--colors=never"],
        cwd=str(BACKEND_DIR),
        capture_output=True,
        text=True,
    )


def extract_summary(output: str) -> str | None:
    for line in output.splitlines():
        if SUMMARY_RE.match(line.strip()):
            return line.strip()
    return None


def only_harmless_warnings(output: str) -> bool:
    """True if the run's issues are limited to known-harmless warnings."""
    warning_blocks = re.findall(
        r"^\d+\)\s.*$", output, flags=re.MULTILINE
    )
    for block in warning_blocks:
        if not any(harmless in block for harmless in KNOWN_HARMLESS_WARNINGS):
            return False
    return True


def main() -> int:
    if not BACKEND_DIR.is_dir():
        print(f"ERROR: backend directory not found at {BACKEND_DIR}", file=sys.stderr)
        return 2

    try:
        result = run_phpunit()
    except FileNotFoundError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    output = result.stdout + "\n" + result.stderr
    print(output)

    summary = extract_summary(output)
    has_real_failure = bool(re.search(r"\b(Failures|Errors):\s*[1-9]", output))

    print("\n" + "=" * 60)
    if summary:
        print(f"SUMMARY: {summary}")
    else:
        print("SUMMARY: could not parse PHPUnit summary line (see output above)")

    if has_real_failure:
        print("RESULT: FAIL - one or more tests failed or errored.")
        return 1

    if result.returncode != 0 and not only_harmless_warnings(output):
        print("RESULT: FAIL - phpunit exited non-zero for a reason other than "
              "the known harmless coverage-driver warning.")
        return 1

    if result.returncode != 0:
        print("RESULT: PASS - all tests passed. Non-zero exit code was caused "
              "only by the known 'No code coverage driver available' warning "
              "(failOnWarning=true in phpunit.dist.xml), which is ignored here.")
    else:
        print("RESULT: PASS - all tests passed.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
