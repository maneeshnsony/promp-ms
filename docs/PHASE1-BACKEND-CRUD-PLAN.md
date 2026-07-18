# Phase 1 — Backend CRUD Implementation Plan

## Context

Phase 0 is done, and the Auth slice of Phase 1 is already implemented (`AuthController`, `AuthFilter`, `AuthContext`, `UserModel`, `SKIP_AUTH` bypass — see `docs/PHASE1-AUTH-PLAN.md`). This plan covers the remaining **Backend CRUD** checklist item of Phase 1 (`docs/TODO.md` lines 67-80): `PromptModel`/`PromptController` with pivot sync and versioning, plus plain `CategoryController`/`TagController`/`RoleController`. Frontend dashboard MVP is separate follow-up work and is out of scope here.

`docs/PLAN.md` (lines 390-680) is the authoritative spec and gives ready-made reference code for `PromptModel` and `PromptController`. This plan follows that code closely, but calls out one real gap: `attachRelations()` in `PLAN.md` is a no-op stub (`return $prompts;`) — it must be implemented for real since categories/tags/roles need to actually appear on prompt responses.

Currently `backend/app/Models/` and `backend/app/Controllers/Api/V1/` have no CRUD files yet (only `.gitkeep`/`AuthController.php`/`PingController.php`/`HealthController.php`). The protected route group in `backend/app/Config/Routes.php:15-16` is empty and ready to receive routes.

## Backend (CodeIgniter 4.7.4)

1. **`backend/app/Models/CategoryModel.php`, `TagModel.php`, `RoleModel.php`** (new) — near-identical: `$table`, `returnType = 'array'`, `useTimestamps = true`, `allowedFields = ['name', 'slug']` (`CategoryModel` also includes `icon`, `color`), validation `name` required/unique, `slug` required/unique.

2. **`backend/app/Models/PromptModel.php`** (new) — per `docs/PLAN.md` lines 394-438: `$table = 'prompts'`, `useSoftDeletes = true`, `allowedFields = ['title','description','notes','is_pinned','created_by']`, validation (`title` required/max 255, `description` required, `notes` permit_empty), and `scopeFilters(array $params)` building filtered/joined query for `category`/`tag`/`role`/`pinned`/`search`.

3. **`backend/app/Models/PromptVersionModel.php`** (new) — `$table = 'prompt_versions'`, `allowedFields = ['prompt_id','title','description','edited_by']`, `useTimestamps = false` (uses its own `edited_at` default), `returnType = 'array'`.

4. **`backend/app/Controllers/Api/V1/CategoryController.php`, `TagController.php`, `RoleController.php`** (new) — plain `ResourceController`-style CRUD: `index()` (no pagination needed — small reference tables), `create()`/`update($id)` with validation via `validateData`, `delete($id)`. Every response wrapped in the envelope `{status, data, meta?, message?}`.

5. **`backend/app/Controllers/Api/V1/PromptController.php`** (new) — per `docs/PLAN.md` lines 445-556, implementing:
   - `index()` — reads `category/tag/role/pinned/search/page/per_page` query params, `page` default 1, `per_page` default 20 capped at 100, filters via `scopeFilters()`, excludes soft-deleted, orders `is_pinned DESC, created_at DESC`, returns `meta: {page, per_page, total}`.
   - `create()` — validates, sets `created_by = AuthContext::id()`, inserts, syncs all three pivots with `$data['category_ids'] ?? []` (empty array, not null, on create).
   - `update($id)` — 404 via `failNotFound()` if missing; snapshots pre-edit `title`/`description`/`edited_by` into `prompt_versions` **before** applying the update; syncs pivots with `?? null` (so omitted keys leave that relation untouched, per the `syncPivot` null-means-untouched contract).
   - `delete($id)` — soft delete (`$this->model->delete($id)`, which respects `useSoftDeletes`).
   - `trackCopy($id)` — increments `copy_count` via query builder, returns bare `204` (fire-and-forget, no envelope body needed).
   - `versions($id)` — returns all `prompt_versions` rows for the prompt, `ORDER BY edited_at DESC`.
   - `syncPivot(string $table, int $promptId, string $foreignKey, ?array $ids)` — private helper exactly as in `PLAN.md` lines 538-549: `null` → no-op; else delete-all-then-batch-insert.
   - `attachRelations(array $prompts)` — **implement for real** (unlike PLAN.md's stub): given the prompt ID list, run three bulk queries (`prompt_category` joined to `categories`, same for tags/roles) grouped by `prompt_id`, then map each prompt's `categories`/`tags`/`roles` arrays on. One query per relation, not per row.

6. **`backend/app/Config/Routes.php`** — inside the existing empty protected group (`Routes.php:15-16`), add:
   ```php
   $routes->get('prompts', 'Api\V1\PromptController::index');
   $routes->get('prompts/(:num)', 'Api\V1\PromptController::show/$1');
   $routes->post('prompts', 'Api\V1\PromptController::create');
   $routes->put('prompts/(:num)', 'Api\V1\PromptController::update/$1');
   $routes->delete('prompts/(:num)', 'Api\V1\PromptController::delete/$1');
   $routes->post('prompts/(:num)/copy', 'Api\V1\PromptController::trackCopy/$1');
   $routes->get('prompts/(:num)/versions', 'Api\V1\PromptController::versions/$1');

   $routes->resource('categories', ['controller' => 'Api\V1\CategoryController', 'except' => 'new,edit,show']);
   $routes->resource('tags', ['controller' => 'Api\V1\TagController', 'except' => 'new,edit,show']);
   $routes->resource('roles', ['controller' => 'Api\V1\RoleController', 'except' => 'new,edit,show']);
   ```
   (Or explicit `get/post/put/delete` lines per controller if `resource()` route naming doesn't match — verify generated URIs match `docs/PLAN.md` lines 342-353 exactly before relying on the shortcut.)

7. **Remove the throwaway `PingController`/`_ping` route** if still present, now that real protected routes exist to verify the `auth` filter (per `PHASE1-AUTH-PLAN.md` step 6's note that it was meant to be temporary).

## Verification

1. `docker exec prompt-ms-api php spark routes` — confirm all new routes list under the `cors, auth` filter group.
2. With `SKIP_AUTH=true` (or a valid Bearer token): `curl -X POST .../api/v1/categories -d '{"name":"Test","slug":"test"}'` → expect `201` envelope with the created row.
3. Create a prompt with `category_ids`/`tag_ids`/`role_ids`, then `GET /prompts/{id}` — confirm `data.categories`/`tags`/`roles` are populated (validates `attachRelations` isn't the PLAN.md stub).
4. `PUT` the same prompt with only `title` changed (no `category_ids` key) → `GET /prompts/{id}/versions` shows the pre-edit snapshot, and categories are unchanged (validates `syncPivot`'s null-means-untouched behavior).
5. `POST /prompts/{id}/copy` → expect bare `204`; re-`GET` the prompt and confirm `copy_count` incremented.
6. `GET /prompts?page=2&per_page=5&pinned=1` → confirm `meta.total`/pagination math and the `is_pinned DESC, created_at DESC` ordering.
7. `DELETE /prompts/{id}` → confirm subsequent `GET /prompts` (index) excludes it, but the row still exists in the DB with `deleted_at` set.
8. No-bearer-token request to any of these routes (with `SKIP_AUTH=false`) → `401`, confirming controllers sit correctly behind `AuthFilter`.
