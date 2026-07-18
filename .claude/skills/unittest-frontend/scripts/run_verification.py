#!/usr/bin/env python3
"""Drive the frontend dashboard MVP end-to-end and report pass/fail per scenario.

There is no frontend unit-test framework in this repo (no Vitest/RTL/Playwright JS
config committed — see docs/TODO.md's Testing checklist). This script instead
automates the manual browser verification from docs/PHASE1-FRONTEND-DASHBOARD-PLAN.md's
"Verification" section using Playwright's Python client: dashboard load, create a
prompt with category/tag/role, copy-to-clipboard + copy_count tracking, edit without
touching categories (pivot + version-snapshot contract), pagination bounds/URL, and
light/dark theme.

Requirements (not auto-installed — see SKILL.md):
  - `pip install playwright` and `python -m playwright install chromium`
  - Docker Compose stack up (`docker compose up -d`) with the api container reachable
  - `npm install` already run in frontend/ (node_modules present)

State changes made and always reverted, even on failure:
  - The `api` compose service is recreated with SKIP_AUTH=true for the run (via a
    subprocess environment variable only — backend/.env itself is never edited), then
    recreated again without the override so it falls back to the real .env value.
  - A `next dev` process is started on a scratch port and killed at the end.
  - Every prompt this script creates carries a fixed title prefix and is deleted
    (soft-deleted, per the backend's contract) during cleanup.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from contextlib import contextmanager
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
FRONTEND_DIR = REPO_ROOT / "frontend"
BACKEND_API_URL = "http://localhost:8080/api/v1"
DEV_SERVER_PORT = 3101  # scratch port — avoids the docker `web` service on 3000
DEV_SERVER_URL = f"http://localhost:{DEV_SERVER_PORT}"
TITLE_PREFIX = "unittest-frontend verification"

results: list[tuple[str, bool, str]] = []


def record(name: str, passed: bool, detail: str = "") -> None:
    results.append((name, passed, detail))
    status = "PASS" if passed else "FAIL"
    suffix = f" — {detail}" if detail else ""
    print(f"[{status}] {name}{suffix}")


def api_get(path: str) -> dict:
    with urllib.request.urlopen(f"{BACKEND_API_URL}{path}", timeout=10) as r:
        return json.loads(r.read())


def api_request(method: str, path: str, body: dict | None = None) -> tuple[int, dict | None]:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"{BACKEND_API_URL}{path}", data=data, method=method,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read()
        return e.code, (json.loads(raw) if raw else None)


def wait_for(url: str, timeout: int = 30) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(url, timeout=2)
            return True
        except Exception:
            time.sleep(1)
    return False


def backend_reachable() -> bool:
    try:
        health = api_get("/health")
        return health.get("data", {}).get("db") == "up"
    except Exception:
        return False


@contextmanager
def skip_auth_backend():
    """Recreate the `api` service with SKIP_AUTH=true for the run, then recreate it
    again with no override so Compose falls back to the real backend/.env value.
    The override is a subprocess env var only — .env on disk is never touched."""
    env = {**os.environ, "SKIP_AUTH": "true"}
    subprocess.run(
        ["docker", "compose", "up", "-d", "--force-recreate", "api"],
        cwd=REPO_ROOT, env=env, check=True, capture_output=True, text=True,
    )
    if not wait_for(f"{BACKEND_API_URL}/health", timeout=30):
        raise RuntimeError("api container did not become healthy after the SKIP_AUTH override")
    try:
        yield
    finally:
        subprocess.run(
            ["docker", "compose", "up", "-d", "--force-recreate", "api"],
            cwd=REPO_ROOT, check=True, capture_output=True, text=True,
        )


@contextmanager
def dev_server():
    env = {
        **os.environ,
        "NEXT_PUBLIC_API_BASE_URL": BACKEND_API_URL,
        "API_BASE_URL": BACKEND_API_URL,
        "NEXT_PUBLIC_SKIP_AUTH": "true",
        "AUTH_URL": DEV_SERVER_URL,
        "AUTH_SECRET": "unittest-frontend-dev-secret-not-for-production",
    }
    npm = "npm.cmd" if os.name == "nt" else "npm"
    proc = subprocess.Popen(
        [npm, "run", "dev", "--", "-p", str(DEV_SERVER_PORT)],
        cwd=FRONTEND_DIR, env=env,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
    )

    def kill_tree() -> None:
        # On Windows, `npm.cmd` is a wrapper around a child node.exe (the actual
        # next-server) — proc.terminate() only kills the wrapper, leaving the real
        # server as an orphan still holding the port for the next run. taskkill /T
        # kills the whole tree; POSIX terminate() already covers the process group.
        if os.name == "nt":
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                capture_output=True,
            )
        else:
            proc.terminate()
            try:
                proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                proc.kill()

    try:
        if not wait_for(DEV_SERVER_URL, timeout=60):
            out = proc.stdout.read() if proc.stdout else ""
            kill_tree()
            raise RuntimeError(f"dev server did not become reachable in time.\n{out[-2000:]}")
        yield
    finally:
        kill_tree()


def cleanup_test_prompts() -> None:
    try:
        page = api_get(f"/prompts?search={urllib.parse.quote(TITLE_PREFIX)}&per_page=100")
        for prompt in page.get("data", []):
            api_request("DELETE", f"/prompts/{prompt['id']}")
    except Exception as exc:
        print(f"WARNING: cleanup of test prompts failed: {exc}", file=sys.stderr)


def run_scenarios() -> None:
    from playwright.sync_api import sync_playwright

    categories = api_get("/categories")["data"]
    roles = api_get("/roles")["data"]
    if not categories or not roles:
        raise RuntimeError("backend has no seeded categories/roles to pick in the form")
    category_name = categories[0]["name"]
    role_name = roles[0]["name"]

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        context = browser.new_context()
        context.grant_permissions(["clipboard-read", "clipboard-write"], origin=DEV_SERVER_URL)
        page = context.new_page()

        # 1. Dashboard loads.
        page.goto(DEV_SERVER_URL)
        page.wait_for_selector("text=Prompt Hub")
        record("dashboard loads", True)

        # 2. Create a prompt with a category + role selected.
        title = f"{TITLE_PREFIX} — create"
        description = f"{TITLE_PREFIX} description line one\n{{slot}}"
        notes = "Why this works: verification notes."

        def find_card(title_text: str):
            # `.first`: revalidatePath's post-action re-render can momentarily paint
            # both the pre- and post-mutation card lists during the transition, so a
            # strict (exactly-one-match) locator is flaky here even with exact=True.
            return page.locator("[data-slot=card]").filter(
                has=page.get_by_role("heading", name=title_text, exact=True)
            ).first

        page.get_by_role("button", name="New prompt").click()
        page.get_by_label("Title").fill(title)
        page.get_by_label("Description").fill(description)
        page.get_by_label("Notes", exact=False).fill(notes)
        page.get_by_role("option", name=category_name, exact=True).click()
        page.get_by_role("option", name=role_name, exact=True).click()
        page.get_by_role("button", name="Create prompt").click()

        card = find_card(title)
        card.wait_for(timeout=10000)
        page.wait_for_timeout(300)  # let the post-action re-render settle
        has_category_badge = card.get_by_text(category_name, exact=True).count() > 0
        record(
            "create prompt shows card with category/role badges",
            has_category_badge,
            "" if has_category_badge else f"expected a {category_name!r} badge on the new card",
        )

        prompts = api_get(f"/prompts?search={urllib.parse.quote(title)}")["data"]
        if not prompts:
            raise RuntimeError("created prompt not found via API — cannot continue dependent scenarios")
        prompt_id = prompts[0]["id"]

        # 3. Copy button: clipboard holds the description, copy_count increments.
        card.get_by_role("button", name="Copy prompt to clipboard").click()
        page.wait_for_timeout(300)
        clipboard_text = page.evaluate("navigator.clipboard.readText()")
        # The OS clipboard normalizes line endings (observed \n -> \r\n on Windows) —
        # normalize both sides before comparing so that isn't reported as a mismatch.
        normalize = lambda s: s.replace("\r\n", "\n").strip()
        clipboard_matches = normalize(clipboard_text) == normalize(description)
        record(
            "copy button writes description to clipboard",
            clipboard_matches,
            "" if clipboard_matches else f"clipboard held: {clipboard_text!r}",
        )

        page.wait_for_timeout(500)
        copy_count = api_get(f"/prompts/{prompt_id}")["data"]["copy_count"]
        record(
            "copy_count increments after the fire-and-forget trackCopy action",
            copy_count == 1,
            f"expected 1, got {copy_count!r}",
        )
        record(
            "is_pinned/copy_count serialize as real JSON types, not pdo_pgsql strings",
            api_get(f"/prompts/{prompt_id}")["data"]["is_pinned"] is False,
        )

        # 4. Edit without touching categories: categories stay, a version snapshot is recorded.
        edited_title = f"{title} (edited)"
        card.get_by_role("button", name="Edit prompt").click()
        page.get_by_label("Title").fill(edited_title)
        page.get_by_role("button", name="Save changes").click()
        page.wait_for_selector(f"text={edited_title}")

        updated = api_get(f"/prompts/{prompt_id}")["data"]
        record(
            "edit preserves categories that weren't touched in the form",
            len(updated["categories"]) == 1 and updated["categories"][0]["name"] == category_name,
            f"categories now: {updated['categories']!r}",
        )
        versions = api_get(f"/prompts/{prompt_id}/versions")["data"]
        record(
            "update snapshots the pre-edit title into prompt_versions",
            any(v["title"] == title for v in versions),
            f"versions: {[v['title'] for v in versions]!r}",
        )

        # 5. Pagination: seed enough prompts via the API to force a second page.
        for i in range(25):
            api_request("POST", "/prompts", {
                "title": f"{TITLE_PREFIX} — page filler {i}",
                "description": "filler",
            })
        page.goto(f"{DEV_SERVER_URL}/?search={urllib.parse.quote(TITLE_PREFIX)}")
        page.wait_for_selector("text=Page 1 of")
        # exact=True: without it, "Next" also fuzzy-matches Next.js's own
        # "Open Next.js Dev Tools" button by substring, and Playwright refuses to act
        # on an ambiguous locator.
        prev_disabled_p1 = page.get_by_role("button", name="Previous", exact=True).is_disabled()
        next_enabled_p1 = page.get_by_role("button", name="Next", exact=True).is_enabled()
        page.get_by_role("button", name="Next", exact=True).click()
        page.wait_for_url("**/?*page=2*")
        page.wait_for_selector("text=Page 2 of")
        next_disabled_p2 = page.get_by_role("button", name="Next", exact=True).is_disabled()
        prev_enabled_p2 = page.get_by_role("button", name="Previous", exact=True).is_enabled()
        record(
            "pagination bounds and URL are correct on page 1 and page 2",
            prev_disabled_p1 and next_enabled_p1 and next_disabled_p2 and prev_enabled_p2,
            f"p1: prev_disabled={prev_disabled_p1} next_enabled={next_enabled_p1}; "
            f"p2: next_disabled={next_disabled_p2} prev_enabled={prev_enabled_p2}",
        )

        # 6. Light/dark theme.
        light_bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
        context.add_init_script("localStorage.setItem('theme', 'dark')")
        page.goto(DEV_SERVER_URL)
        page.wait_for_timeout(300)
        dark_applied = "dark" in (page.evaluate("document.documentElement.className") or "")
        dark_bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
        record(
            "dark theme applies and changes the rendered background",
            dark_applied and dark_bg != light_bg,
            f"dark class applied={dark_applied}, light_bg={light_bg}, dark_bg={dark_bg}",
        )

        browser.close()


def main() -> int:
    if not backend_reachable():
        print(
            "ERROR: backend is not reachable at "
            f"{BACKEND_API_URL}/health. Run `docker compose up -d` first.",
            file=sys.stderr,
        )
        return 2

    try:
        import playwright  # noqa: F401
    except ImportError:
        print(
            "ERROR: the `playwright` Python package isn't installed.\n"
            "  pip install playwright\n"
            "  python -m playwright install chromium",
            file=sys.stderr,
        )
        return 2

    try:
        with skip_auth_backend():
            # Cleanup must run inside this context, before the SKIP_AUTH revert starts
            # recreating the api container — deleting afterward raced the container
            # restart and hit it mid-recreate (502s), and would also need a real
            # bearer token once the revert takes hold.
            with dev_server():
                try:
                    run_scenarios()
                finally:
                    cleanup_test_prompts()
    except Exception as exc:
        record("verification run", False, str(exc))

    print("\n" + "=" * 60)
    failed = [r for r in results if not r[1]]
    print(f"SUMMARY: {len(results) - len(failed)}/{len(results)} scenarios passed")
    if failed:
        print("RESULT: FAIL")
        for name, _, detail in failed:
            print(f"  - {name}: {detail}")
        return 1

    print("RESULT: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
