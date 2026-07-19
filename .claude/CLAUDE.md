# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**Phase 0 (Foundation) is implemented**: `backend/` (CodeIgniter 4.7.4 + firebase/php-jwt), `frontend/` (Next.js 16, Tailwind v4, shadcn/ui, next-themes), the Docker layer, all 9 migrations (run), and category/role seeders (run). **Phase 1 is fully implemented** — Auth (`AuthController`/`AuthFilter`/`AuthContext`/`UserModel`), Backend CRUD (`PromptController`/`PromptModel`/`PromptVersionModel` + plain `CategoryController`/`TagController`/`RoleController` with their models), and the frontend dashboard MVP (`app/page.tsx`, `PromptCard`/`PromptFormDialog`/`Pagination`, `lib/api.ts`/`lib/actions.ts`) — see `docs/PHASE1-AUTH-PLAN.md`, `docs/PHASE1-BACKEND-CRUD-PLAN.md`, and `docs/PHASE1-FRONTEND-DASHBOARD-PLAN.md`. **Phase 2 (search/filters/pinned row/toasts/empty+loading states/category-tag-role management) and Phase 3 (`{slot}` fill-in dialog, prompt version history view) are both fully implemented** — see `docs/PHASE2-DISCOVERY-POLISH-PLAN.md` and `docs/PHASE3-DEEPER-ENHANCEMENTS-PLAN.md`. Cross-cutting testing/security work (frontend Vitest suite, a `RateLimitFilter` on write endpoints and `auth/google`, a JWKS-mock test for the mismatched-`aud` case, and a `.github/workflows/ci.yml`) is done per `docs/CROSS-CUTTING-ONGOING-PLAN.md` — remaining open items there are pure infra/ops (HTTPS termination, DB backups) or a committed Playwright E2E suite (currently covered manually). Phase 4 is not yet started and should not be built ahead of being asked — see `docs/TODO.md` for the phased checklist. **`docs/PLAN.md` remains the authoritative spec** for the data model (DDL), API contract, auth flow, and design system; its decisions log records settled deviations (notably: no containerized Postgres — see below). Implement *against* the plan rather than re-deriving architecture.
- Category/tag/role filters in `components/filter-sidebar.tsx` are single-select per facet, not true multi-select — `lib/api.ts`'s `PromptListParams` and the backend's `scopeFilters()` only accept one id per facet; expanding to multi-value filters needs a backend change first (see the Phase 2 plan's scope decision).
- `AuthController::googleJwks()` is a protected, overridable method (not inlined `file_get_contents`) specifically so `tests/unit/AuthControllerJwksTest.php` can swap in a fixture keyset — don't inline the JWKS fetch back into `google()`.
- `RateLimitFilter` (`app/Filters/RateLimitFilter.php`) keys its bucket by authenticated user id (falls back to IP pre-auth) and is applied per-route in `app/Config/Routes.php`, not globally — new write routes need `['filter' => 'ratelimit']` added explicitly (see existing routes for the pattern). `SKIP_RATE_LIMIT=true` bypasses it, mirroring `SKIP_AUTH`.
- Writes triggered from client components (the copy button, the prompt form dialog) go through Server Actions in `frontend/lib/actions.ts`, not `apiFetch` directly — `apiFetch` only attaches the bearer token server-side, so a client-side call would silently go unauthenticated.
- `PromptController::attachRelations()` (backend) casts `is_pinned`/`copy_count` before responding — pdo_pgsql returns booleans/bigints as the strings `"t"`/`"f"`/`"123"`, which round-trip as truthy JS strings if left uncast.

### Commands

- Repo root: `docker compose build` / `docker compose up -d` (3 services; see Architecture). Requires a reachable **host** Postgres — see below.
- Migrations/seeds (inside the api container): `docker exec prompt-ms-api php spark migrate` and `php spark db:seed DatabaseSeeder`.
- `backend/`: `composer test` (PHPUnit). `frontend/`: `npm run dev` / `npm run build` / `npm run lint`.
- Local secrets live in git-ignored `.env` (repo root) and `backend/.env`; templates are the committed `.env.example` files. `GOOGLE_CLIENT_ID` is single-sourced in the root `.env` (compose injects it into both `web` and `api`).

## What this project is

An internal tool for storing, organizing, and quickly reusing prompts — searchable by category/tag/role, with one-click copy. Modeled loosely on Claude Code's Prompt Library (card-based, filterable by category + a lightweight roles facet, with pinned "start here" entries).

**Stack:** CodeIgniter 4 (PHP 8.4, REST API) · Next.js 16 App Router (Node 24) · PostgreSQL 18 · Docker / Docker Compose. Full version rationale is in `docs/PLAN.md`'s "Tech stack" table.

## Architecture (once implemented)

- `backend/` — CodeIgniter 4 REST API (PHP-FPM 8.4), all endpoints under `api/v1`, fronted by Nginx (reverse proxy → FastCGI, not served directly).
- `frontend/` — Next.js 16 App Router UI. Server Components call the API container-to-container via Nginx's Docker service name (`API_BASE_URL`); client-side calls go through the published host port (`NEXT_PUBLIC_API_BASE_URL`). Both must be set — see `lib/api.ts` in the plan.
- `docker-compose.yml` at repo root wires three services on one network (`prompt_ms_net`), container names `prompt-ms-*`: `api`, `nginx`, `web`. **PostgreSQL is NOT containerized** (deliberate deviation from PLAN.md's original Docker section, recorded in its decisions log): the api connects to a host-installed Postgres at `host.docker.internal:5432`, database `prompt_ms`, and carries a healthcheck probing it. On Linux hosts, Postgres must listen beyond loopback for the `host-gateway` route to reach it, and `backend/writable/` must be writable by uid 1000 (php-fpm's `www` user) since the bind mount overrides image ownership.
- Auth is split by design: Next.js (Auth.js v5) drives the Google OAuth redirect/consent UX, but the CodeIgniter `AuthFilter` is the actual security boundary — it independently verifies Google's ID token against JWKS and issues its own short-lived (1h) session JWT. Next.js middleware only redirects for UX; it must never be treated as the enforcement point (see "Why verification happens on the backend" in the plan — this is a deliberate reaction to a real 2025 Next.js middleware-bypass vulnerability class).
- Three independent, flatly-structured facets on `prompts`: `categories`, `tags`, `roles` — each a many-to-many pivot table (`prompt_category`, `prompt_tag`, `prompt_role`) with identical shape, synced via the same helper (`syncPivot`) in `PromptController`. There is intentionally no phase→category→role hierarchy.
- Edits to a prompt snapshot the *pre-edit* title/description into `prompt_versions` before applying the update (full snapshot per edit, not a diff).
- Every API response uses one envelope shape: `{ "status": "success"|"error", "data": ..., "meta"?: {...}, "message"?: "..." }`.
- `GET /api/v1/health` (`HealthController`) is a public liveness/readiness probe — the only unauthenticated `api/v1` route besides `auth/google`. It returns the standard envelope with `db` status (`200` healthy, `503` if Postgres is unreachable). This is the HTTP-facing probe (via nginx); it's separate from the container-level healthcheck in `docker-compose.yml`, which probes host Postgres directly for orchestration.

## Key constraints to preserve when implementing

- **Auth:** Google OAuth only — no passwords, no other providers, no roles/permissions system beyond "has a valid session." Don't add tiered permissions unless asked.
- **PHP packages must stay precompiled.** The backend Dockerfile installs PHP itself via Alpine's `apk add php84-*` (prebuilt binaries) rather than the official `php:8.4-fpm-alpine` image + `docker-php-ext-install`, which would recompile extensions from source on every build. Preserve this pattern when adding new PHP extensions — check Alpine's package repo for a precompiled `php84-*` package before reaching for `docker-php-ext-install`.
- **No Redis / caching layer** — deferred to Phase 4. Don't introduce one speculatively.
- **Pagination is required everywhere prompts are listed**, default `per_page=20`, capped at 100.
- Search is intentionally simple `LIKE` over title + description for now (upgrade path: Postgres `tsvector`/`GIN`, not yet needed).
- Use CodeIgniter's Query Builder everywhere — never raw SQL string concatenation. Never route prompt content through `dangerouslySetInnerHTML` on the frontend (React's default escaping is relied upon).
- `Cors.php`'s `allowedOrigins` must never be `*` in production.

## Roadmap phases (for sequencing new work)

0. Foundation — Docker Compose, full schema (9 migrations), CI4 + Next.js scaffolding.
1. Core CRUD + Auth (MVP) — prompts/categories/tags/roles CRUD, Google sign-in, copy-to-clipboard with `copy_count` tracking, pagination.
2. Discovery & polish — debounced search, filter sidebar, pinned "start here" row, toasts, empty/loading states.
3. Deeper enhancements — `{slot}` placeholder fill-in dialog before copy, prompt version history view.
4. Future / not yet requested — Redis, import/export, analytics view. Don't build ahead into this phase without being asked.
