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
- [x] `HealthController` + public `GET /api/v1/health` route (no auth) — liveness/readiness probe returning the standard envelope with DB status (`200` healthy / `503` DB unreachable)

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

### Auth ✅ Complete (pending manual Google Cloud Console redirect-URI registration to test live sign-in)
- [x] `AuthController::google` — verify Google ID token against JWKS, check `aud` matches `GOOGLE_CLIENT_ID`, optional `hd` domain check
- [x] `UserModel::upsertFromGoogle` — find-or-create by `google_sub`
- [x] Mint short-lived (1h) backend session JWT (`HS256`, `APP_JWT_SECRET`)
- [x] `AuthFilter` — the real enforcement point; rejects any `api/v1` request without a valid bearer token (401). _Also gates on the dev/testing-only `SKIP_AUTH` flag (default `false`) — see `docs/PHASE1-AUTH-PLAN.md`._
- [x] `AuthContext` — static per-request holder for the authenticated user (safe under PHP-FPM's one-request-per-process model)
- [x] `app/Config/Routes.php` — `auth/google` route (no filter) + `api/v1` group with `['cors', 'auth']` filters. _Uses the `filter` (singular) group option key — PLAN.md's `filters` example is silently ignored by CI4 4.7 (see decisions log #12)._
- [x] Frontend: `auth.ts` (Auth.js v5 beta + Google provider, JWT session strategy, exchanges Google ID token for backend token in the `jwt` callback)
- [x] Frontend: `app/api/auth/[...nextauth]/route.ts`
- [x] Frontend: `proxy.ts` — UX-only redirect for signed-out users (explicitly not the security boundary). _Renamed from `middleware.ts`: Next.js 16 deprecated that file convention in favor of `proxy` (decisions log #10). Also short-circuits when `NEXT_PUBLIC_SKIP_AUTH=true`._
- [x] Frontend: `app/login/page.tsx` — "Sign in with Google"
- [x] `docker-compose.yml` / root `.env.example` — `SKIP_AUTH` wired to both `api` (`SKIP_AUTH`) and `web` (`NEXT_PUBLIC_SKIP_AUTH`) services
- [x] `backend/docker/zz-prompt-ms.conf` — `clear_env = no`, without which docker-compose `environment:` overrides never reach php-fpm workers (decisions log #13)

### Backend CRUD
- [ ] `PromptModel` — validation rules (`title` required/max 255, `description` required), soft deletes, `scopeFilters()` (category/tag/role/pinned/search)
- [ ] `PromptController::index` — pagination (`page`, `per_page`, default 20, capped 100), ordered by `is_pinned DESC, created_at DESC`
- [ ] `PromptController::show`
- [ ] `PromptController::create` — validates, sets `created_by`, syncs `category_ids`/`tag_ids`/`role_ids`
- [ ] `PromptController::update` — snapshots pre-edit title/description into `prompt_versions` before applying changes
- [ ] `PromptController::delete` — soft delete
- [ ] `PromptController::trackCopy` — fire-and-forget, increments `copy_count`, returns 204
- [ ] `PromptController::versions` — returns version history for a prompt
- [ ] `syncPivot()` helper — shared many-to-many sync for category/tag/role (delete-then-insert; `null` leaves relation untouched on partial update)
- [ ] `CategoryController` — plain CRUD (index/create/update/delete)
- [ ] `TagController` — plain CRUD
- [ ] `RoleController` — plain CRUD
- [ ] Every response follows the envelope: `{ "status": "success"|"error", "data": ..., "meta"?: {...}, "message"?: "..." }`

### Frontend — dashboard MVP
- [ ] `lib/types.ts` — `Category`, `Tag`, `Role`, `Prompt` interfaces
- [ ] `lib/api.ts` — fetch wrapper; server-side calls use `API_BASE_URL` (Docker service name via nginx), client-side calls use `NEXT_PUBLIC_API_BASE_URL`
- [ ] `components/prompt-card.tsx` — copy button (Clipboard API + `execCommand` fallback), pinned marker, expandable "why this works" notes, category/tag badges
- [ ] `components/category-badge.tsx`
- [ ] `components/tag-chip.tsx`
- [ ] `components/prompt-form-dialog.tsx` — create/edit form (title, description, notes, category/tag/role pickers)
- [ ] `components/pagination.tsx` — Previous/Next, writes `page` to URL query string
- [ ] `app/page.tsx` — Server Component dashboard: fetch prompts with session token, render card grid + pagination
- [ ] `app/layout.tsx`
- [ ] Copy-to-clipboard wired to `POST /prompts/{id}/copy` (fire-and-forget, never blocks the actual copy)

---

## Phase 2 — Discovery & polish

Search, filtering, curation.

- [ ] `components/search-bar.tsx` — debounced, writes `search` to URL query string
- [ ] `components/filter-sidebar.tsx` — category/tag/role multi-select, writes to URL query string
- [ ] Pinned "Start here" row (curated view of `is_pinned = true` prompts)
- [ ] Toast notifications (shadcn/ui) for save/delete confirmations
- [ ] Empty states (no prompts / no search results)
- [ ] Loading states (skeletons or spinners for Server Component fetches)
- [ ] `app/categories/page.tsx` — manage categories UI
- [ ] `app/tags/page.tsx` — manage tags UI
- [ ] `app/roles/page.tsx` — manage roles UI

---

## Phase 3 — Deeper enhancements

The richer approved features.

- [ ] `{slot}` placeholder detection — regex `/\{(\w+)\}/g` over `description`
- [ ] `SlotFillDialog` — one input per unique token; copies description with tokens substituted, opens instead of the direct copy when placeholders are present
- [ ] Prompt version history view — UI for `GET /api/v1/prompts/{id}/versions`

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
- [ ] Backend: PHPUnit feature tests hitting `/api/v1/prompts` end-to-end, including the no-bearer-token 401 case
- [ ] Backend: unit tests for `PromptModel` validation and pivot-sync logic
- [x] Backend: `AuthFilter`/`AuthContext`/`AuthController`/`UserModel` covered — `tests/unit/{AuthFilterTest,AuthContextTest,AuthControllerTest,UserModelTest}.php`: missing/garbage/expired/valid bearer token, `SKIP_AUTH` bypass on and off, `AuthController::google`'s missing-`id_token` (400) and malformed-token (401) paths, `UserModel::upsertFromGoogle` create-then-update by `google_sub`. _Not yet covered: a real Google-signed token with a mismatched `aud` — would need a mocked JWKS response rather than a live fetch to test deterministically._
- [ ] Frontend: Vitest + React Testing Library for `PromptCard`, `Pagination`, filters
- [ ] Frontend: Playwright E2E — sign in → create prompt → see card → click copy → clipboard holds description → `copy_count` increments
- [ ] CI: run `composer test` and `npm test` on every PR, plus `docker compose build`. _`composer test` currently exits 1 on a fresh host even with all tests green — `phpunit.dist.xml`'s `failOnWarning="true"` trips on "No code coverage driver available" when Xdebug/PCOV isn't installed; a CI image needs one of those, or drop `failOnWarning`._

### Security & non-functional
- [ ] Verify every Google ID token server-side (signature via JWKS, `aud`, optional `hd`) — never trust unverified claims
- [ ] Keep backend session JWT short-lived (1h) with minimal payload (user id, email only)
- [ ] `AuthFilter` remains the real enforcement point — Next.js middleware stays UX-only
- [ ] CodeIgniter Query Builder everywhere — no raw SQL string concatenation
- [ ] Never route prompt content through `dangerouslySetInnerHTML`
- [ ] `Cors.php` `allowedOrigins` restricted to real frontend origin(s) in production — never `*`
- [ ] Rate-limit write endpoints and `/auth/google` (CI4 Throttler or Nginx `limit_req`)
- [ ] Serve over HTTPS outside local dev (required for Google OAuth redirect URIs)
- [ ] Secrets (`AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, `APP_JWT_SECRET`, DB password) kept in git-ignored `.env` files; commit `.env.example` instead
- [ ] Automate PostgreSQL backups (`pg_dump` cron or managed-DB snapshots) once real data accumulates
