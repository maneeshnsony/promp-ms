# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repository currently contains only a design/implementation plan (`docs/PLAN.md`) — no backend, frontend, or Docker code has been scaffolded yet. **`docs/PLAN.md` is the authoritative spec** for this project ("Prompt Hub"): it contains the finalized data model (DDL), API contract, auth flow, Docker Compose setup, and a decisions log recording which open questions have already been settled. Read it before starting implementation work, and implement *against* it rather than re-deriving architecture from scratch — most design choices below were deliberated with the user and have a documented "why."

When code is eventually scaffolded into `backend/` and `frontend/`, update this file with the real build/lint/test commands (expected to be `composer test` / `composer install` in `backend/`, `npm run dev` / `npm test` / `npm run build` in `frontend/`, and `docker compose up` / `docker compose build` at the repo root — see the Testing strategy section of the plan).

## What this project is

An internal tool for storing, organizing, and quickly reusing prompts — searchable by category/tag/role, with one-click copy. Modeled loosely on Claude Code's Prompt Library (card-based, filterable by category + a lightweight roles facet, with pinned "start here" entries).

**Stack:** CodeIgniter 4 (PHP 8.4, REST API) · Next.js 16 App Router (Node 24) · PostgreSQL 18 · Docker / Docker Compose. Full version rationale is in `docs/PLAN.md`'s "Tech stack" table.

## Architecture (once implemented)

- `backend/` — CodeIgniter 4 REST API (PHP-FPM 8.4), all endpoints under `api/v1`, fronted by Nginx (reverse proxy → FastCGI, not served directly).
- `frontend/` — Next.js 16 App Router UI. Server Components call the API container-to-container via Nginx's Docker service name (`API_BASE_URL`); client-side calls go through the published host port (`NEXT_PUBLIC_API_BASE_URL`). Both must be set — see `lib/api.ts` in the plan.
- `docker-compose.yml` at repo root wires five services on one network (`prompthub_net`): `api`, `nginx`, `web`, `db` (Postgres), `pgadmin` (dev-only).
- Auth is split by design: Next.js (Auth.js v5) drives the Google OAuth redirect/consent UX, but the CodeIgniter `AuthFilter` is the actual security boundary — it independently verifies Google's ID token against JWKS and issues its own short-lived (1h) session JWT. Next.js middleware only redirects for UX; it must never be treated as the enforcement point (see "Why verification happens on the backend" in the plan — this is a deliberate reaction to a real 2025 Next.js middleware-bypass vulnerability class).
- Three independent, flatly-structured facets on `prompts`: `categories`, `tags`, `roles` — each a many-to-many pivot table (`prompt_category`, `prompt_tag`, `prompt_role`) with identical shape, synced via the same helper (`syncPivot`) in `PromptController`. There is intentionally no phase→category→role hierarchy.
- Edits to a prompt snapshot the *pre-edit* title/description into `prompt_versions` before applying the update (full snapshot per edit, not a diff).
- Every API response uses one envelope shape: `{ "status": "success"|"error", "data": ..., "meta"?: {...}, "message"?: "..." }`.

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
