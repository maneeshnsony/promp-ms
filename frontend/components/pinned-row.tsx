import { PromptCard } from "@/components/prompt-card";
import { getPrompts } from "@/lib/api";
import type { Category, Role, Tag } from "@/lib/types";

export async function PinnedRow({
  categories,
  tags,
  roles,
}: {
  categories: Category[];
  tags: Tag[];
  roles: Role[];
}) {
  const { data: pinned } = await getPrompts({ pinned: true, per_page: 10 });

  if (pinned.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase">Start here</h2>
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
      >
        {pinned.map((prompt) => (
          <PromptCard key={prompt.id} prompt={prompt} categories={categories} tags={tags} roles={roles} />
        ))}
      </div>
    </section>
  );
}
