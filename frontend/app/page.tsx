import { PlusIcon } from "lucide-react";
import Link from "next/link";

import { auth } from "@/auth";
import { getCategories, getPrompts, getRoles, getTags } from "@/lib/api";
import { PromptCard } from "@/components/prompt-card";
import { PromptFormDialog } from "@/components/prompt-form-dialog";
import { Pagination } from "@/components/pagination";
import { SearchBar } from "@/components/search-bar";
import { FilterSidebar } from "@/components/filter-sidebar";
import { PinnedRow } from "@/components/pinned-row";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session && !skipAuth) {
    // proxy.ts already redirects signed-out users before they reach this page; this is
    // a defense-in-depth fallback, not the security boundary (see docs/PHASE1-AUTH-PLAN.md).
    return null;
  }

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = typeof params.search === "string" ? params.search : undefined;
  const category = typeof params.category === "string" ? Number(params.category) : undefined;
  const tag = typeof params.tag === "string" ? Number(params.tag) : undefined;
  const role = typeof params.role === "string" ? Number(params.role) : undefined;
  const hasActiveFilters = Boolean(search || category || tag || role);

  const [{ data: prompts, meta }, categories, tags, roles] = await Promise.all([
    getPrompts({ page, per_page: 20, search, category, tag, role }),
    getCategories(),
    getTags(),
    getRoles(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-foreground">Prompt Hub</h1>
        <div className="flex items-center gap-3">
          <Link href="/categories" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            Categories
          </Link>
          <Link href="/tags" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            Tags
          </Link>
          <Link href="/roles" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            Roles
          </Link>
          <PromptFormDialog
            mode="create"
            categories={categories}
            tags={tags}
            roles={roles}
            trigger={
              <Button>
                <PlusIcon /> New prompt
              </Button>
            }
          />
        </div>
      </div>

      <div className="mb-6">
        <SearchBar />
      </div>

      {!hasActiveFilters && <PinnedRow categories={categories} tags={tags} roles={roles} />}

      <div className="flex gap-6">
        <FilterSidebar categories={categories} tags={tags} roles={roles} />

        <div className="flex flex-1 flex-col">
          {prompts.length === 0 ? (
            <EmptyState hasActiveFilters={hasActiveFilters} />
          ) : (
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
            >
              {prompts.map((prompt) => (
                <PromptCard key={prompt.id} prompt={prompt} categories={categories} tags={tags} roles={roles} />
              ))}
            </div>
          )}

          <Pagination page={meta.page} perPage={meta.per_page} total={meta.total} />
        </div>
      </div>
    </main>
  );
}
