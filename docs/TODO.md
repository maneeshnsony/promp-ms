# Prompt Hub — TODO

A phased, checkbox-style task list derived from [`PLAN.md`](./PLAN.md), the authoritative spec for this project. Phase boundaries match `PLAN.md`'s Roadmap table exactly — see that doc for full rationale, DDL, code samples, and the decisions log behind each item.

---

## Phase 0 — Foundation

Infra + full schema.

### Docker
- [ ] `docker-compose.yml` at repo root — 5 services (`api`, `nginx`, `web`, `db`, `pgadmin`) on one network (`prompthub_net`)
- [ ] `backend/Dockerfile` — multi-stage (Composer vendor stage + Alpine runtime), PHP 8.4 installed via precompiled `apk add php84-*` packages (never `docker-php-ext-install`)
- [ ] `frontend/Dockerfile` — multi-stage (deps → builder → runner), `next.config.js` sets `output: 'standalone'`
- [ ] `docker/nginx/default.conf` — reverse proxy → PHP-FPM via FastCGI
- [ ] `db` service healthcheck (`pg_isready`) wired so `api` waits on `service_healthy`
- [ ] `backend/.env` + `.env.example` (dotted CI4 keys: `database.default.*`, `GOOGLE_CLIENT_ID`, `GOOGLE_ALLOWED_DOMAIN`, `APP_JWT_SECRET`)
- [ ] `frontend` env vars in compose: `NEXT_PUBLIC_API_BASE_URL`, `API_BASE_URL`, `AUTH_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`

### Backend scaffold
- [ ] `composer create-project codeigniter4/appstarter backend` (CI4 4.7.x)
- [ ] `composer require firebase/php-jwt`
- [ ] `app/Config/Cors.php` — configure `allowedOrigins` (never `*`), include `Authorization` in `allowedHeaders`
- [ ] `app/Config/Filters.php` — register `cors` and `auth` filter aliases
- [ ] Directory layout: `app/Controllers/Api/V1/`, `app/Filters/`, `app/Libraries/`, `app/Models/`, `app/Database/Migrations/`, `app/Database/Seeds/`

### Frontend scaffold
- [ ] `npx create-next-app` — Next.js 16, App Router, Node 24, Turbopack
- [ ] Tailwind CSS v4 setup
- [ ] shadcn/ui initialized (Dialog, Select, Command, Toast components copied in)
- [ ] lucide-react installed
- [ ] Geist Sans + Geist Mono fonts wired (Mono reserved for prompt `description` text)
- [ ] Design tokens from `PLAN.md`'s Design system section (`--bg`, `--surface`, `--border`, `--text`, `--text-muted`, `--accent`, dark mode variants)

### Database — all 9 migrations
- [ ] `users` (google_sub, email, name, avatar_url, unique constraints)
- [ ] `categories` (name, slug, icon, color)
- [ ] `tags` (name, slug)
- [ ] `roles` (name, slug)
- [ ] `prompts` (title, description, notes, is_pinned, copy_count, created_by FK, soft-delete `deleted_at`)
- [ ] `prompt_category` pivot (composite PK, cascading FKs)
- [ ] `prompt_tag` pivot (composite PK, cascading FKs)
- [ ] `prompt_role` pivot (composite PK, cascading FKs)
- [ ] `prompt_versions` (prompt_id FK, title, description snapshot, edited_by, edited_at)
- [ ] Indexes: `idx_prompts_title`, `idx_prompts_pinned` (partial, `WHERE is_pinned = TRUE`), pivot FK indexes, `idx_prompt_versions_prompt_id`
- [ ] Seeders: categories (`Onboard`, `Understand`, `Plan`, `Prototype`, `Build`, `Test`, `Refactor`, `Review`, `Git`, `Release`, `Debug`, `Data`, `Automate`) and roles (`PM`, `Design`, `Docs`, `Marketing`, `Security`, `Ops`, `Data`)

---

## Phase 1 — Core CRUD + Auth (MVP)

Prompts, categories, tags, roles, Google sign-in.

### Auth
- [ ] `AuthController::google` — verify Google ID token against JWKS, check `aud` matches `GOOGLE_CLIENT_ID`, optional `hd` domain check
- [ ] `UserModel::upsertFromGoogle` — find-or-create by `google_sub`
- [ ] Mint short-lived (1h) backend session JWT (`HS256`, `APP_JWT_SECRET`)
- [ ] `AuthFilter` — the real enforcement point; rejects any `api/v1` request without a valid bearer token (401)
- [ ] `AuthContext` — static per-request holder for the authenticated user (safe under PHP-FPM's one-request-per-process model)
- [ ] `app/Config/Routes.php` — `auth/google` route (no filter) + `api/v1` group with `['cors', 'auth']` filters
- [ ] Frontend: `auth.ts` (Auth.js v5 + Google provider, JWT session strategy, exchanges Google ID token for backend token in the `jwt` callback)
- [ ] Frontend: `app/api/auth/[...nextauth]/route.ts`
- [ ] Frontend: `middleware.ts` — UX-only redirect for signed-out users (explicitly not the security boundary)
- [ ] Frontend: `app/login/page.tsx` — "Sign in with Google"

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
- [ ] Backend: test confirming `AuthController::google` rejects a token whose `aud` doesn't match
- [ ] Frontend: Vitest + React Testing Library for `PromptCard`, `Pagination`, filters
- [ ] Frontend: Playwright E2E — sign in → create prompt → see card → click copy → clipboard holds description → `copy_count` increments
- [ ] CI: run `composer test` and `npm test` on every PR, plus `docker compose build`

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
