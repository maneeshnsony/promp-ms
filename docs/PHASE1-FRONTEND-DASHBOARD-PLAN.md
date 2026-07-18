# Phase 1 — Frontend Dashboard MVP Implementation Plan

## Context

Phase 0 is done, and Phase 1's Auth slice (`auth.ts`, `proxy.ts` as middleware, `lib/api.ts`'s `apiFetch`, `lib/types.ts`'s `User`, `app/login/page.tsx`) and Backend CRUD slice (`PromptController`/`CategoryController`/`TagController`/`RoleController`, response envelope, pivot sync, pagination) are already planned/implemented — see `docs/PHASE1-AUTH-PLAN.md` and `docs/PHASE1-BACKEND-CRUD-PLAN.md`. This plan covers the remaining **Frontend — dashboard MVP** checklist item (`docs/TODO.md` lines 82-92): the read/write UI that lists, creates, edits, and copies prompts. `docs/PLAN.md`'s Design system section and its `app/page.tsx`/`prompt-card.tsx` code samples are the reference, adapted to fit the auth slice's already-built `apiFetch`.

**Gap found and accounted for below:** `lib/api.ts`'s `apiFetch` currently only attaches the `Authorization` header on the server (`typeof window === "undefined"`) — on the client it's silently omitted even when a session exists. `trackCopy` must be called from a client component (the copy button), so it needs a client-safe way to get the bearer token. Fix: extend `apiFetch` to also read the token client-side via `next-auth/react`'s `useSession`... but `apiFetch` is a plain async function, not a hook. Simplest correct fix: add a small `trackCopy` action that runs as a Next.js Server Action (still server-side, so `auth()` resolves normally) invoked from the client `PromptCard`'s `onClick`, rather than calling `apiFetch` directly from client code. This avoids touching `apiFetch`'s existing (working) server-side auth behavior at all.

This project is a non-standard Next.js version — before writing any App Router / Server Action code, skim `frontend/node_modules/next/dist/docs/` for anything that deviates from familiar Next.js conventions (per `frontend/AGENTS.md`).

## Frontend (Next.js 16, App Router)

1. **`frontend/lib/types.ts`** — add (without touching existing `User`/module augmentation) `Category { id, name, slug, icon, color }`, `Tag { id, name, slug }`, `Role { id, name, slug }`, `Prompt { id, title, description, notes, is_pinned, copy_count, categories: Category[], tags: Tag[], roles: Role[], created_at, updated_at }`, and `Paginated<T> { data: T[], meta: { page, per_page, total } }` matching the envelope confirmed in `docs/PHASE1-BACKEND-CRUD-PLAN.md`.

2. **`frontend/lib/api.ts`** — add typed helpers built on the existing `apiFetch` (don't re-implement fetch/base-URL/auth logic): `getPrompts(params, opts?)` → `GET /prompts` with query string from `{search, category, tag, role, pinned, page, per_page}`, returns `Paginated<Prompt>`; `createPrompt(body)`, `updatePrompt(id, body)`, `deletePrompt(id)`; `getCategories()`, `getTags()`, `getRoles()` (plain arrays, no pagination per backend plan). Also add a `trackCopy(id)` **Server Action** (`"use server"` at top of function or a separate `lib/actions.ts`) that calls `apiFetch(\`/prompts/${id}/copy\`, {method:'POST'})` — this is what the client `PromptCard` invokes, resolving the auth-header gap noted in Context.

3. **`frontend/components/category-badge.tsx`** — small badge using shadcn `Badge` (needs `npx shadcn add badge`), background derived from the category's `color` field (desaturated per design tokens), `icon` rendered via `lucide-react` if present.

4. **`frontend/components/tag-chip.tsx`** — plain neutral-gray chip (no color), same `Badge` primitive with a muted variant.

5. **`frontend/components/prompt-card.tsx`** (client component) — per `docs/PLAN.md`'s sample: `rounded-xl` card, hairline border, shadow only on hover; pinned corner marker (rotated Pin icon) when `is_pinned`; copy button — `navigator.clipboard.writeText(description)` primary, falls back to a hidden `<textarea>` + `document.execCommand('copy')` on failure — swaps Copy→Check icon for 1.5s, and separately fires the `trackCopy(id)` Server Action **without awaiting** (fire-and-forget, never blocks the copy feedback); expandable "Why this works" `notes` toggle; renders `categories`/`tags` badge/chip rows (roles intentionally omitted from the card per the design spec). Needs `npx shadcn add card` if not already present (confirmed missing — only `button/command/dialog/input/input-group/select/sonner/textarea` exist).

6. **`frontend/components/prompt-form-dialog.tsx`** (client component) — shadcn `Dialog` + `Form` (needs `npx shadcn add form`) wrapping title/description/notes fields and three multi-select pickers for `category_ids`/`tag_ids`/`role_ids` (use the already-installed `Command`/`cmdk` combobox pattern rather than adding a new popover/checkbox dependency, since `cmdk` is already a dep). Handles both create (empty initial values) and edit (pre-filled, `PUT` on submit) via a shared `mode: 'create' | 'edit'` prop. On success, calls `router.refresh()` (Server Component re-fetch) and shows a `sonner` toast — toasts are technically Phase 2 polish per `docs/TODO.md`, but `sonner` is already installed and wiring a bare success/error toast here is near-zero extra cost; keep it minimal (no empty/loading states — those are explicitly Phase 2).

7. **`frontend/components/pagination.tsx`** — Previous/Next buttons, disabled at bounds using `meta.page`/`meta.total`/`meta.per_page`; writes `page` to the URL query string via `useRouter`/`useSearchParams` (client component), preserving other existing query params.

8. **`frontend/app/page.tsx`** (new — currently missing) — Server Component: `await auth()` (guard, don't force-unwrap, consistent with the `SKIP_AUTH` note in `docs/PHASE1-AUTH-PLAN.md`), read `searchParams` (`page`, and any Phase-2 filters passed through harmlessly), call `getPrompts({page, per_page: 20, ...searchParams})`, render a `grid` (`auto-fill, minmax(280px,1fr)` per design tokens) of `PromptCard`s plus `Pagination`, and a "New prompt" button opening `PromptFormDialog` in create mode.

9. **`frontend/app/layout.tsx`** — already scaffolded (Geist fonts, `ThemeProvider`, metadata) from Phase 0; confirm it still fits (e.g. wrap children with a `Toaster` from `sonner` for the dialog's toast calls) rather than rebuilding it.

## Verification

1. `npm run dev` in `frontend/`, with backend CRUD routes live and `SKIP_AUTH=true` (or a real session) — visit `/` and confirm the prompt grid renders with pagination controls.
2. Create a prompt via the dialog with categories/tags/roles selected → confirm it appears in the grid with correct badges (validates the form → `createPrompt` → `attachRelations` round trip).
3. Click the copy button on a card → confirm clipboard actually holds the description (test the `execCommand` fallback path by temporarily denying clipboard permission) and that `copy_count` increments after a refresh (validates the `trackCopy` Server Action carries auth correctly, closing the gap noted above).
4. Edit an existing prompt, omit changing categories → confirm categories are unchanged after save (validates `update_prompt` passes `category_ids: undefined`/omitted rather than `[]`, matching the backend's null-means-untouched pivot contract).
5. Paginate with `per_page` small enough to force multiple pages → confirm Previous/Next disable correctly at bounds and the URL `page` query param updates.
6. Toggle light/dark theme → confirm card colors/badges still read correctly against both `--bg`/`--surface` tokens.
