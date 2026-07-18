import { PlusIcon } from "lucide-react";

import { auth } from "@/auth";
import { getCategories, getPrompts, getRoles, getTags } from "@/lib/api";
import { PromptCard } from "@/components/prompt-card";
import { PromptFormDialog } from "@/components/prompt-form-dialog";
import { Pagination } from "@/components/pagination";
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

  const [{ data: prompts, meta }, categories, tags, roles] = await Promise.all([
    getPrompts({ page, per_page: 20, search }),
    getCategories(),
    getTags(),
    getRoles(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-foreground">Prompt Hub</h1>
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

      {prompts.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No prompts yet — create one to get started.
        </p>
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
    </main>
  );
}
