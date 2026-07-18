# Phase 1 — Authentication (Google OAuth) Implementation Plan

## Context

Phase 0 (Docker layer, full 9-migration schema, CI4 + Next.js scaffolding) is done and committed. Phase 1 adds Core CRUD + Auth. This plan covers **only the Auth slice** of Phase 1 — Google sign-in end to end — since that's the foundation everything else (protected CRUD routes, `created_by`/`edited_by` attribution) depends on. Prompt/category/tag/role CRUD is separate follow-up work.

The repo currently has a half-wired trap: `app/Config/Filters.php` already references `App\Filters\AuthFilter` and registers an `auth` alias, but the class itself doesn't exist yet (only `.gitkeep`). It only boots today because no route attaches that filter. This must be resolved as part of this work.

`docs/PLAN.md` is the authoritative spec for the flow and code shape, but its Decisions log (bottom of file) supersedes some literal details used in this plan: database name is `prompt_ms` (not `prompt_hub`), containers are `prompt-ms-*`, there is no containerized `db`/`pgadmin` — Postgres is host-installed.

**Confirmed with user:**
- `APP_JWT_SECRET` (currently the literal placeholder in `backend/.env`) → generate a real random secret and write it in.
- `GOOGLE_ALLOWED_DOMAIN` → leave empty, any Google account can sign in.
- Google Cloud Console redirect URI (`http://localhost:3000/api/auth/callback/google`) is **not yet configured** — this is a manual step outside Claude Code's control; sign-in can't be tested end-to-end until the user does it, but implementation isn't blocked.
- Root `.env` already has `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` populated.
- **New:** the whole auth flow must be bypassable via a single env flag, for local dev / testing without wiring up Google OAuth each time. Default is auth **enabled** — the flag is opt-in to skip, never opt-in to enforce.

## Auth-bypass flag (dev/testing only)

A single flag, sourced once in the root `.env` (same single-source pattern already used for `GOOGLE_CLIENT_ID` per `docker-compose.yml`), fans out to both containers under names each stack expects:

- Root `.env` / `.env.example`: `SKIP_AUTH=false` (default `false` — auth is enforced unless explicitly turned off).
- `docker-compose.yml`: `api` service gets `SKIP_AUTH=${SKIP_AUTH:-false}`; `web` service gets `NEXT_PUBLIC_SKIP_AUTH=${SKIP_AUTH:-false}` (client-readable, since `middleware.ts` and client components need it too).

**Backend behavior when `SKIP_AUTH=true`:** `AuthFilter::before()` checks the flag first, before touching the `Authorization` header at all. If set, it skips JWT verification entirely and lets the request through unauthenticated — it does **not** fabricate a fake user. `AuthContext::id()`/`email()` simply return `null` in this mode, which the schema already supports (`prompts.created_by` is nullable with `ON DELETE SET NULL` per `docs/PLAN.md`'s DDL) — no seeded dummy user needed.

**Frontend behavior when `NEXT_PUBLIC_SKIP_AUTH=true`:**
- `middleware.ts` short-circuits to `NextResponse.next()` without calling `auth()` — no redirect to `/login`.
- `lib/api.ts`'s `apiFetch` omits the `Authorization` header instead of reading a (possibly absent) `session.backendToken`.
- Any Server Component that currently does `const session = await auth(); … session!.backendToken` (e.g. the future dashboard `page.tsx` from `docs/PLAN.md`) must guard that call rather than force-unwrap it, since there may be no session at all in this mode. This is a downstream note for whoever builds the CRUD dashboard in the next slice of Phase 1 — flagging it now so it isn't missed.
- `/login` page still renders and still works normally if visited directly (the flag skips *enforcement*, not the sign-in feature itself).

**Why this shape:** keeping the bypass entirely inside `AuthFilter` and `middleware.ts` — rather than, say, stubbing `AuthController::google` or removing routes — means turning the flag back off restores full real auth with zero other code changes, and nothing about the CRUD controllers needs to know the flag exists.

## Backend (CodeIgniter 4.7.4)

1. **`backend/.env`** — replace `APP_JWT_SECRET` placeholder with a real generated secret (e.g. `openssl rand -base64 48`). Verify `database.default.database = prompt_ms` and `GOOGLE_CLIENT_ID` are correct. Leave `GOOGLE_ALLOWED_DOMAIN` empty. Add `SKIP_AUTH = false` (compose overrides this per-environment via the root `.env`'s `SKIP_AUTH`; the file default stays `false` so a bare `php spark serve` outside Docker still enforces auth).

2. **`backend/app/Models/UserModel.php`** (new, currently `.gitkeep` only) — `$table = 'users'`, `allowedFields = ['google_sub','email','name','avatar_url','last_login_at']`, `returnType = 'array'`. Add `upsertFromGoogle(object $claims): array` — look up by `google_sub`; update `name`/`avatar_url`/`last_login_at` on match, else insert; return the row.

3. **`backend/app/Libraries/AuthContext.php`** (new) — static holder per `docs/PLAN.md` lines 782-798: `set(object $claims)`, `id(): ?int`, `email(): ?string`. Safe under PHP-FPM's one-request-per-process model (no long-running server here).

4. **`backend/app/Filters/AuthFilter.php`** (new — resolves the dangling reference in `Filters.php`) — `before()`: **first**, `if (config('App')->... ` — simpler: `if ((bool) env('SKIP_AUTH', false)) { return; }` (let the request through, `AuthContext` stays unset/`null`). Otherwise, proceed as originally planned: regex-match `Bearer\s+(.+)` from the `Authorization` header, 401 `{status:'error', message:'Missing bearer token'}` if absent; `JWT::decode($token, new Key(env('APP_JWT_SECRET'), 'HS256'))`, 401 `{status:'error', message:'Invalid or expired session'}` on failure; otherwise `AuthContext::set($decoded)`. Empty `after()`.

5. **`backend/app/Controllers/Api/V1/AuthController.php`** (new) — `google()` per `docs/PLAN.md` lines 710-747: read `id_token` from JSON body (400/validation error if missing) → fetch Google's JWKS (`https://www.googleapis.com/oauth2/v3/certs`) → `JWT::decode` + `JWK::parseKeySet` (401 "Invalid Google token" on failure) → verify `claims->aud === env('GOOGLE_CLIENT_ID')` (401 if mismatched) → optional `hd` check against `GOOGLE_ALLOWED_DOMAIN` (no-op since it's empty) → `UserModel::upsertFromGoogle($claims)` → mint HS256 JWT (`sub`, `email`, `iat`, `exp` = +3600s) → respond `{status:'success', data:{token, user}}`, matching `HealthController`'s existing envelope convention (`ResponseTrait`).

6. **`backend/app/Config/Routes.php`** — add the public login route and a protected group for future CRUD:
   ```php
   $routes->post('api/v1/auth/google', 'Api\V1\AuthController::google', ['filter' => 'cors']);
   $routes->group('api/v1', ['filters' => ['cors', 'auth']], function ($routes) {
       // Phase 1 CRUD routes land here later
   });
   ```
   Leave `api/v1/health` as-is (cors only, unauthenticated).

7. **Composer** — no change needed; `firebase/php-jwt ^7.1` is already in `backend/composer.json`.

8. **CORS** — no change to `app/Config/Cors.php`. `supportsCredentials` stays `false`: auth is a Bearer token attached by frontend JS, not a browser-managed cookie, so credentialed CORS mode isn't needed. `Authorization` is already in `allowedHeaders`.

## Frontend (Next.js 16.2.10)

Currently a blank slate for auth — no `next-auth` dependency, no `auth.ts`, `middleware.ts`, login page, `lib/api.ts`, or `lib/types.ts`.

1. **`frontend/package.json`** — run `npm info next-auth dist-tags` to get the actual current v5 tag (don't hardcode a beta tag from `docs/PLAN.md` since it may have gone stable since), then `npm install next-auth@<tag>`.

2. **`frontend/auth.ts`** (new) — `NextAuth({ providers: [Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })], session: { strategy: 'jwt' }, callbacks: { jwt, session } })` per `docs/PLAN.md` lines 650-678. Use explicit `clientId`/`clientSecret` reading the existing `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` var names (already shared with the backend via root `.env` per Decisions #6) rather than renaming them to Auth.js's auto-inferred `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`. The `jwt` callback POSTs `account.id_token` to `${process.env.API_BASE_URL}/auth/google` and stashes the returned `data.token` as `token.backendToken`.

3. **`frontend/app/api/auth/[...nextauth]/route.ts`** (new) — re-export `{ GET, POST }` from `@/auth`.

4. **`frontend/middleware.ts`** (new) — if `process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'`, export a middleware that just returns `NextResponse.next()`; otherwise `export { auth as middleware } from '@/auth'`, matcher excluding `api/auth`, `login`, `_next/static`, `_next/image`, `favicon.ico`. Per `docs/PLAN.md`: UX redirect only — `AuthFilter` on the backend is the real boundary, and it enforces the same flag independently.

5. **`frontend/lib/types.ts`** (new) — minimal `User` shape plus module augmentation (`declare module 'next-auth'` / `'next-auth/jwt'`) adding `backendToken` to the session/token types.

6. **`frontend/lib/api.ts`** (new) — `apiFetch(path, options)` skeleton that attaches `Authorization: Bearer <token>` and `Content-Type: application/json` when a token is available; if `NEXT_PUBLIC_SKIP_AUTH === 'true'`, omits the `Authorization` header entirely instead of passing an empty/undefined bearer value. Just enough to support the auth flow, not full CRUD methods yet.

7. **`frontend/app/login/page.tsx`** (new) — minimal page with a client component "Sign in with Google" button calling `signIn('google')`, styled per `docs/PLAN.md`'s design system tokens (teal `--accent`, existing Tailwind v4/shadcn setup).

8. **Env vars** — add `API_BASE_URL` (`http://localhost:8080/api/v1`, container-to-container via nginx service name in Docker, or `http://localhost:8080/api/v1` locally) wherever `docker-compose.yml`/`.env` already wires frontend env (per Decisions log naming, not `prompthub`). Also add `NEXT_PUBLIC_SKIP_AUTH` alongside it, sourced from the root `.env`'s `SKIP_AUTH` (see "Auth-bypass flag" above).

9. **`docker-compose.yml` / root `.env.example`** — add `SKIP_AUTH=false` to `.env.example` with a comment explaining it's dev-only; wire it into both the `api` and `web` service `environment:` blocks as described above.

## Verification

1. `docker compose up -d` (3 services: `api`, `nginx`, `web` — no `db`/`pgadmin` per Decisions #6/#9); confirm the api healthcheck reaches host Postgres.
2. Confirm migrations already applied (`docker exec prompt-ms-api php spark migrate --check` or re-run `migrate`) — `users` table already matches the DDL.
3. **Manual prerequisite, not automatable here:** add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI on the Google Cloud OAuth client tied to `GOOGLE_CLIENT_ID`.
4. Browser: visit `/login`, sign in with Google, confirm redirect succeeds and `session.backendToken` is populated (inspect via a temporary debug log or `/api/auth/session`).
5. `curl -X POST http://localhost:8080/api/v1/auth/google -d '{"id_token":"<captured-from-browser-network-tab>"}'` → expect `{"status":"success","data":{"token":...,"user":{...}}}`.
6. Confirm `AuthFilter` behavior on the protected group: no `Authorization` header → 401 "Missing bearer token"; garbage token → 401 "Invalid or expired session"; valid Bearer token → 200 passes through (temporarily add a throwaway `GET api/v1/_ping` route inside the protected group to test this before real CRUD routes exist, then remove it).
7. Confirm no CORS errors in the browser console when the frontend (`localhost:3000`) calls the API (`localhost:8080`).
8. **Bypass flag check:** set `SKIP_AUTH=true` in the root `.env`, `docker compose up -d` to pick it up, and confirm: the throwaway `GET api/v1/_ping` route (or any protected route) returns 200 with **no** `Authorization` header at all; visiting a protected frontend page does not redirect to `/login`. Then flip it back to `false`, restart, and re-confirm steps 4–6 above still enforce real auth (regression check that the flag doesn't leak into the default-off case).
