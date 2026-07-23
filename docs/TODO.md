# Prompt Hub — TODO

A phased, checkbox-style task list derived from [`PLAN.md`](./PLAN.md), the authoritative spec for this project. Phase boundaries match `PLAN.md`'s Roadmap table exactly — see that doc for full rationale, DDL, code samples, and the decisions log behind each item.

---

## Phase 0 — Foundation ✅ Complete

Infra + full schema. All items built, migrated, and seeded — verified end-to-end (3 containers up, api healthcheck healthy, `GET /api/v1/health` returns `200`/`db:up`, web serving 200, 12 `timestamptz` columns, 13 categories + 7 roles seeded).

### Docker
- [x] `docker-compose.yml` at repo root — 3 services (`api`, `nginx`, `web`) on one network (`prompt_ms_net`). _Deviation (PLAN.md decisions 6 & 9): no containerized `db` (api connects to host Postgres at `host.docker.internal:5432`), and no `pgadmin` (use any host DB client)._
- [x] `backend/Dockerfile` — multi-stage (Composer vendor stage + Alpine runtime), PHP 8.4 installed via precompiled `apk add php84-*` packages (never `docker-php-ext-install`)
- [x] `frontend/Dockerfile` — multi-stage (deps → builder → runner), `next.config.ts` sets `output: 'standalone'`
- [x] `docker/nginx/default.conf` — reverse proxy → PHP-FPM via FastCGI
- [x] `api` service healthcheck (`php pg_connect` probe of host Postgres). _Deviation (PLAN.md decision 6): replaces the removed `db` service's `pg_isready`._
- [x] `backend/.env` + `.env.example` (dotted CI4 keys: `database.default.*`, `GOOGLE_ALLOWED_DOMAIN`, `APP_JWT_SECRET`). _`GOOGLE_CLIENT_ID` moved to the root `.env` (single source; compose injects it into api)._
- [x] `frontend` env vars in compose: `NEXT_PUBLIC_API_BASE_URL` (build arg), `API_BASE_URL`, `AUTH_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`

### Backend scaffold
- [x] `composer create-project codeigniter4/appstarter backend` (CI4 4.7.4)
- [x] `composer require firebase/php-jwt`
- [x] `app/Config/Cors.php` — configure `allowedOrigins` (never `*`), include `Authorization` in `allowedHeaders`
- [x] `app/Config/Filters.php` — register `cors` and `auth` filter aliases (the `AuthFilter` class itself lands in Phase 1)
- [x] Directory layout: `app/Controllers/Api/V1/`, `app/Filters/`, `app/Libraries/`, `app/Models/`, `app/Database/Migrations/`, `app/Database/Seeds/`
- [x] `HealthController` + public `GET /api/v1/health` route (no auth) — liveness/readiness probe returning the standard envelope with DB status (`200` healthy / `503` DB unreachable). The DB probe lives behind a protected, overridable `isDatabaseUp()` method (same pattern as `AuthController::googleJwks()`) so both branches are covered by `tests/unit/HealthControllerTest.php`

### Frontend scaffold
- [x] `npx create-next-app` — Next.js 16, App Router, Node 24, Turbopack
- [x] Tailwind CSS v4 setup
- [x] shadcn/ui initialized (Nova preset)
- [x] lucide-react installed
- [x] Geist Sans + Geist Mono fonts wired (Mono reserved for prompt `description` text)
- [x] Design tokens from `PLAN.md`'s Design system section (mapped onto shadcn variables in `globals.css`, light + dark) + next-themes `ThemeProvider`

### Database — all 9 migrations
- [x] `users` (google_sub, email, name, avatar_url, unique constraints)
- [x] `categories` (name, slug, icon, color)
- [x] `tags` (name, slug)
- [x] `roles` (name, slug)
- [x] `prompts` (title, description, notes, is_pinned, copy_count, created_by FK, soft-delete `deleted_at`)
- [x] `prompt_category` pivot (composite PK, cascading FKs)
- [x] `prompt_tag` pivot (composite PK, cascading FKs)
- [x] `prompt_role` pivot (composite PK, cascading FKs)
- [x] `prompt_versions` (prompt_id FK, title, description snapshot, edited_by, edited_at)
- [x] Indexes: `idx_prompts_title`, `idx_prompts_pinned` (partial, `WHERE is_pinned = TRUE`, raw DDL), pivot FK indexes, `idx_prompt_versions_prompt_id`
- [x] Seeders: categories (`Onboard`, `Understand`, `Plan`, `Prototype`, `Build`, `Test`, `Refactor`, `Review`, `Git`, `Release`, `Debug`, `Data`, `Automate`) and roles (`PM`, `Design`, `Docs`, `Marketing`, `Security`, `Ops`, `Data`)

---

## Phase 1 — Core CRUD + Auth (MVP)

Prompts, categories, tags, roles, Google sign-in.

### Auth ✅ Complete
- [x] `AuthController::google` — verify Google ID token against JWKS, check `aud` matches `GOOGLE_CLIENT_ID`, optional `hd` domain check
  _Bug found and fixed: `iss` was never checked. Not exploitable given the hardcoded JWKS source, but now validates the full aud/iss/hd/signature checklist._
- [x] `UserModel::upsertFromGoogle` — find-or-create by `google_sub`
- [x] Mint short-lived (1h) backend session JWT (`HS256`, `APP_JWT_SECRET`)
- [x] `AuthFilter` — the real enforcement point; rejects any `api/v1` request without a valid bearer token (401). _Also gates on the dev/testing-only `SKIP_AUTH` flag (default `false`) — see `docs/local/PHASE1-AUTH-PLAN.md` (gitignored scratch doc; may not exist in your checkout)._
- [x] `AuthContext` — static per-request holder for the authenticated user (safe under PHP-FPM's one-request-per-process model)
- [x] `app/Config/Routes.php` — `auth/google` route (no filter) + `api/v1` group with `['cors', 'auth']` filters. _Uses the `filter` (singular) group option key — PLAN.md's `filters` example is silently ignored by CI4 4.7 (see decisions log #12)._
- [x] Frontend: `auth.ts` (Auth.js v5 beta + Google provider, JWT session strategy, exchanges Google ID token for backend token in the `jwt` callback)
- [x] Frontend: `app/api/auth/[...nextauth]/route.ts`
- [x] Frontend: `proxy.ts` — UX-only redirect for signed-out users (explicitly not the security boundary). _Renamed from `middleware.ts`: Next.js 16 deprecated that file convention in favor of `proxy` (decisions log #10). Also short-circuits when `NEXT_PUBLIC_SKIP_AUTH=true`._
- [x] Frontend: `app/login/page.tsx` — "Sign in with Google"
- [x] `docker-compose.yml` / root `.env.example` — `SKIP_AUTH` wired to both `api` (`SKIP_AUTH`) and `web` (`NEXT_PUBLIC_SKIP_AUTH`) services
- [x] `backend/docker/zz-prompt-ms.conf` — `clear_env = no`, without which docker-compose `environment:` overrides never reach php-fpm workers (decisions log #13)
- [x] Manual (external, not a code change): register the OAuth redirect URI (`http://localhost:3000/api/auth/callback/google`) in Google Cloud Console — required before live end-to-end sign-in can be tested; the implementation above isn't blocked by it.

### Backend CRUD ✅ Complete (per `docs/local/PHASE1-BACKEND-CRUD-PLAN.md`, gitignored; pending live DB verification — see that plan's Verification section)
- [x] `PromptModel` — validation rules (`title` required/max 255, `description` required), soft deletes, `scopeFilters()` (category/tag/role/pinned/search)
- [x] `PromptController::index` — pagination (`page`, `per_page`, default 20, capped 100), ordered by `is_pinned DESC, created_at DESC`
- [x] `PromptController::show`
- [x] `PromptController::create` — validates, sets `created_by`, syncs `category_ids`/`tag_ids`/`role_ids`
- [x] `PromptController::update` — snapshots pre-edit title/description into `prompt_versions` before applying changes. _Bug found and fixed via a new pivot-clear test (`testUpdateWithEmptyCategoryIdsArrayClearsExistingPivot`): a payload touching only `category_ids`/`tag_ids`/`role_ids` (no `title`/`description`/`notes`) spuriously 400'd — CI4's `Validation::run()` treats an empty computed rule set as a failure — and would then throw `DataException::forEmptyDataset()` trying to persist a row with nothing in `PromptModel::$allowedFields`. Both are now guarded against; pivot syncs still run regardless of whether any scalar column changed. A second bug found and fixed later: `created_by` was in the update whitelist, letting any authenticated user reassign a prompt's attribution via `PUT`; now explicitly excluded._
- [x] `PromptController::delete` — soft delete
- [x] `PromptController::trackCopy` — fire-and-forget, increments `copy_count`, returns 204
- [x] `PromptController::versions` — returns version history for a prompt
  _Bug found and fixed: didn't check the prompt existed first (unlike every other endpoint), so a nonexistent id returned 200 + `[]` instead of 404._
- [x] `syncPivot()` helper — shared many-to-many sync for category/tag/role (delete-then-insert; `null` leaves relation untouched on partial update)
  _Bug found and fixed: no transaction wrapping meant a mid-sync failure (e.g. a stale id) left the delete committed with nothing re-inserted, permanently dropping a prompt's associations behind a 500. Now wrapped in a transaction — see the CLAUDE.md note on `transException`/`transStrict`._
- [x] `attachRelations()` — implemented for real (bulk-queries categories/tags/roles per prompt list, one query per relation)
- [x] `CategoryModel`/`TagModel`/`RoleModel` + `PromptVersionModel`
- [x] `CategoryController` — plain CRUD (index/create/update/delete)
- [x] `TagController` — plain CRUD
- [x] `RoleController` — plain CRUD
- [x] Every response follows the envelope: `{ "status": "success"|"error", "data": ..., "meta"?: {...}, "message"?: "..." }`
- [x] `app/Config/Routes.php` — protected `api/v1` group populated with all prompt/category/tag/role routes under `['cors', 'auth']`

### Frontend — dashboard MVP ✅ Complete (per `docs/local/PHASE1-FRONTEND-DASHBOARD-PLAN.md`, gitignored; verified end-to-end via a local dev server + Playwright against the live backend — see that plan's Verification section, all 6 steps passed)
- [x] `lib/types.ts` — `Category`, `Tag`, `Role`, `Prompt`, `Paginated<T>`, `PromptFormValues` interfaces
- [x] `lib/api.ts` — typed helpers (`getPrompts`, `createPrompt`, `updatePrompt`, `deletePrompt`, `getCategories`, `getTags`, `getRoles`) built on the existing `apiFetch`; server-side calls use `API_BASE_URL`, client-side use `NEXT_PUBLIC_API_BASE_URL`
- [x] `lib/actions.ts` (new) — Server Actions (`trackCopyAction`, `createPromptAction`, `updatePromptAction`) so writes triggered from client components (`PromptCard`, `PromptFormDialog`) still resolve `auth()` server-side and attach the bearer token — closes the gap `apiFetch` has on the client, documented in the plan's Context section
- [x] `components/prompt-card.tsx` — copy button (Clipboard API + `execCommand` fallback), pinned marker, expandable "why this works" notes, category/tag badges, hover-revealed edit action
- [x] `components/category-badge.tsx` — desaturated round-robin palette by category id, falls back to an explicit `color` field when set; optional `icon` via a small curated lucide-react map
- [x] `components/tag-chip.tsx` — plain neutral badge, no color
- [x] `components/multi-select.tsx` (new) — shared Command-based multi-select for category/tag/role pickers (no Popover component installed, so it renders inline rather than behind a trigger)
- [x] `components/prompt-form-dialog.tsx` — create/edit form (title, description, notes, category/tag/role pickers), plain controlled state (no react-hook-form — not an installed dependency)
- [x] `components/pagination.tsx` — Previous/Next, writes `page` to URL query string
- [x] `components/ui/badge.tsx`, `components/ui/card.tsx` (new) — hand-authored shadcn-style primitives matching the existing `radix-nova` component conventions (no network-dependent `npx shadcn add`)
- [x] `app/page.tsx` — Server Component dashboard: fetch prompts + categories/tags/roles in parallel, render card grid + pagination + "New prompt" dialog trigger
- [x] `app/layout.tsx` — wired `<Toaster />` from `sonner` for save/error toasts
- [x] Copy-to-clipboard wired to `POST /prompts/{id}/copy` (fire-and-forget, never blocks the actual copy) via `trackCopyAction`
- [x] Bug found and fixed during verification: `PromptController::attachRelations()` (backend) — pdo_pgsql returns boolean/bigint columns as the strings `"t"`/`"f"`/`"123"`, not native JSON types, so `is_pinned:"f"` round-tripped as truthy in JS and showed the pinned marker on every prompt; now cast to a real bool/int before the response is built, with a regression test

---

## Phase 2 — Discovery & polish ✅ Complete (per `docs/local/PHASE2-DISCOVERY-POLISH-PLAN.md`, gitignored)

Search, filtering, curation.

- [x] `components/search-bar.tsx` — debounced (300ms), writes `search` to URL query string and resets `page` to 1
- [x] `components/filter-sidebar.tsx` — single-select-per-facet category/tag/role filters (scope decision documented in the phase plan), writes to URL query string independently per facet
- [x] Pinned "Start here" row — `components/pinned-row.tsx`, server-rendered, only shown when no filters are active and at least one pinned prompt exists
- [x] Toast notifications (sonner) for prompt create/update/delete and category/tag/role create/update/delete
- [x] Empty states — `components/empty-state.tsx`: distinct copy for "no prompts at all" vs "search/filters active, zero matches" (with a clear-filters action)
- [x] Loading states — `app/loading.tsx`, automatic Suspense boundary with skeleton cards matching the grid layout
- [x] `app/categories/page.tsx`, `app/tags/page.tsx`, `app/roles/page.tsx` — management UIs built on a shared `components/entity-manager.tsx` (list, inline create/rename via dialog, confirm-before-delete), backed by new `lib/api.ts` CRUD helpers and `lib/actions.ts` Server Actions
  _Bug found and fixed: the Categories page showed "Categorie" (chopping a trailing `s` off the title). `EntityManager` now takes an explicit `singular` prop._

---

## Phase 3 — Deeper enhancements ✅ Complete (per `docs/local/PHASE3-DEEPER-ENHANCEMENTS-PLAN.md`, gitignored)

The richer approved features.

- [x] `{slot}` placeholder detection — `lib/slots.ts`'s `extractSlots`/`fillSlots`, regex `/\{(\w+)\}/g` over `description`
- [x] `components/slot-fill-dialog.tsx` — one input per unique token in first-seen order, live preview, Copy disabled until every slot is filled; wired into `prompt-card.tsx`'s copy-button click handler (opens instead of direct copy only when slots are present)
- [x] `components/version-history-dialog.tsx` — read-only view over `GET /api/v1/prompts/{id}/versions`, newest first, relative timestamps via `Intl.RelativeTimeFormat`, loading skeleton + error toast + "No edits yet" empty state; opened from a new History action on `prompt-card.tsx`
  _Bug found and fixed: fetched directly from the client, so `apiFetch` never attached the bearer token and the route always 401'd in a real deployment. Now routed through a `getPromptVersionsAction` Server Action._

---

## Phase 4 — Future (not yet requested)

Do not build ahead into this phase without being explicitly asked.

- [ ] Redis caching layer
- [ ] JSON import/export
- [ ] "Most-copied" analytics view

---

## Cross-cutting / ongoing

Apply throughout implementation, not tied to a single phase.

### Testing
- [x] Backend: PHPUnit feature tests hitting `/api/v1/prompts` end-to-end, including the no-bearer-token 401 case — `tests/unit/PromptControllerTest.php` (index/show/create/update/delete/trackCopy/versions, pagination ordering, pivot-sync null-means-untouched, the `is_pinned`/`copy_count` JSON-type regression test, `per_page`/`page` clamping at the floor and the 100 ceiling, a page requested past the last result page, and the pivot-clear-with-explicit-`[]` case — see the bug note under Phase 1's `PromptController::update`)
- [x] Backend: unit tests for `PromptModel` validation and pivot-sync logic — `tests/unit/PromptModelTest.php` (`scopeFilters` search/pinned filters plus the `category`/`tag`/`role` join filters individually and combined — guarding against join-fanout duplicate rows — and required-field validation) plus pivot-sync coverage in `PromptControllerTest.php`
- [x] Backend: `AuthFilter`/`AuthContext`/`AuthController`/`UserModel` covered — `tests/unit/{AuthFilterTest,AuthContextTest,AuthControllerTest,UserModelTest}.php`: missing/garbage/expired/valid bearer token, `SKIP_AUTH` bypass on and off, `AuthController::google`'s missing-`id_token` (400) and malformed-token (401) paths, `UserModel::upsertFromGoogle` create-then-update by `google_sub`. `tests/unit/AuthControllerJwksTest.php` (fixture RSA keypair swapped in via `AuthController::googleJwks()`, an overridable protected method, instead of a live JWKS fetch) now covers the mismatched-`aud` case, the full happy path (valid token → 200, user upserted, session JWT issued), and both `GOOGLE_ALLOWED_DOMAIN`/`hd`-claim domain-restriction outcomes (mismatched and matching hosted domain).
- [x] Backend: `CategoryController`/`TagController`/`RoleController` covered — `tests/unit/{CategoryControllerTest,TagControllerTest,RoleControllerTest}.php` (401 without a token, create/update/delete, duplicate-slug validation), plus dedicated model-level tests — `tests/unit/{CategoryModelTest,TagModelTest,RoleModelTest}.php` (required-field and duplicate-name/duplicate-slug validation directly against the model) and `tests/unit/PromptVersionModelTest.php` (insert, multiple versions per prompt retrievable)
- [x] Backend: `RateLimitFilter` covered — `tests/unit/RateLimitFilterTest.php` (normal traffic passes, exceeding the per-minute threshold returns 429, `SKIP_RATE_LIMIT` bypass)
- [x] Backend: `HealthController` covered — `tests/unit/HealthControllerTest.php` (DB-up 200 path via a real request, DB-down 503 path via an `isDatabaseUp()` override)
- [x] Frontend: Vitest + React Testing Library set up (`vitest.config.ts`, `vitest.setup.ts`, `npm test`), plus `@vitest/coverage-v8` (`npm run test:coverage`, no enforced threshold yet). 22 test files co-located next to the components/modules they cover — `lib/api.ts`, `lib/actions.ts`, `lib/slots.ts`, `lib/utils.ts`, `auth.ts`, `proxy.ts`, and most of `components/*` (notably `prompt-card`, `prompt-form-dialog`, `entity-manager`, `multi-select`, `version-history-dialog`, `slot-fill-dialog`, `filter-sidebar`, `prompt-grid`, `pinned-row`). 157 tests passing; ~95% statement / 98% function coverage on the included set (`components/ui/**` and `app/**` excluded from the coverage config as vendored/Server-Component-only). Not covered: `theme-provider.tsx` (thin `next-themes` wrapper) and the legacy `execCommand` clipboard fallback branches.
- [ ] Frontend: Playwright E2E — sign in → create prompt → see card → click copy → clipboard holds description → `copy_count` increments. Manually verified via the `unittest-frontend` skill's Python/Playwright script; not yet a committed `@playwright/test` suite wired into CI (left as a follow-up — the skill script covers the same flow today).
- [x] CI: `.github/workflows/ci.yml` — `composer test` (with a Postgres service container + PCOV via `shivammathur/setup-php`), `npm run lint` + `npm test` + `npm run build` (frontend), and `docker compose build`, all on PR and push to `main`.

### Security & non-functional
- [x] Verify every Google ID token server-side (signature via JWKS, `aud`, optional `hd`) — never trust unverified claims. Verified existing behavior; JWKS source is now swappable for testing (see above) without changing production behavior.
- [x] Keep backend session JWT short-lived (1h) with minimal payload (user id, email only) — verified, unchanged.
  _Bug found and fixed: the frontend had no refresh path for that 1h token against a much longer-lived NextAuth session, so the dashboard hard-crashed for a still-"logged in" user once it expired. `apiFetch` now redirects to `/login` on a server-side 401._
- [x] `AuthFilter` remains the real enforcement point — Next.js middleware stays UX-only — verified, unchanged.
- [x] CodeIgniter Query Builder everywhere — no raw SQL string concatenation — verified across existing and new controllers (category/tag/role management, entity CRUD).
- [x] Never route prompt content through `dangerouslySetInnerHTML` — verified, still true of every Phase 2/3 component added (`SlotFillDialog`, `VersionHistoryDialog`, `EntityManager`).
- [x] `Cors.php` `allowedOrigins` restricted to real frontend origin(s) in production — never `*` — verified, unchanged. Update the list again once a real production frontend origin is known (deploy-time config, not a code task).
- [x] Rate-limit write endpoints and `/auth/google` — `App\Filters\RateLimitFilter` (CI4's built-in `Throttler`, 60 req/min per authenticated user id or IP), applied to all `POST`/`PUT`/`DELETE` routes under `api/v1` and to `auth/google` in `app/Config/Routes.php`. `SKIP_RATE_LIMIT=true` bypasses it the same way `SKIP_AUTH` bypasses auth, for local/dev use.
- [ ] Serve over HTTPS outside local dev (required for Google OAuth redirect URIs) — pure deployment/infra config, not a code change in this repo.
- [x] Secrets (`AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, `APP_JWT_SECRET`, DB password) kept in git-ignored `.env` files; commit `.env.example` instead — verified, unchanged.
- [x] Backend bearer token never exposed to client-side JS — `auth.ts`'s `session()` callback previously copied it onto the NextAuth `session` object, which the public `GET /api/auth/session` route returns verbatim to any same-origin script. Removed; `apiFetch` now decodes it server-side via `next-auth/jwt`'s `getToken()` instead.
- [ ] Automate PostgreSQL backups (`pg_dump` cron or managed-DB snapshots) once real data accumulates — infra/ops runbook item, not application code.
