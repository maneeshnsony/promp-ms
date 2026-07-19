"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { CategoryBadge } from "@/components/category-badge";
import { TagChip } from "@/components/tag-chip";
import { Button } from "@/components/ui/button";
import type { Category, Role, Tag } from "@/lib/types";

// Single-select per facet (category/tag/role each write one query param) — see
// PHASE2-DISCOVERY-POLISH-PLAN.md's scope decision: true multi-select would need a
// scopeFilters()/PromptListParams change on the backend, out of scope for this phase.
function FacetGroup<T extends { id: number; name: string }>({
  label,
  paramKey,
  options,
  activeId,
  onSelect,
  renderOption,
}: {
  label: string;
  paramKey: string;
  options: T[];
  activeId: number | undefined;
  onSelect: (id: number | undefined) => void;
  renderOption: (option: T) => React.ReactNode;
}) {
  if (options.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {activeId !== undefined && (
          <button
            type="button"
            onClick={() => onSelect(undefined)}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            data-param={paramKey}
            onClick={() => onSelect(activeId === option.id ? undefined : option.id)}
            className={
              activeId === option.id
                ? "rounded-full ring-2 ring-ring ring-offset-1 ring-offset-background"
                : "opacity-70 transition-opacity hover:opacity-100"
            }
          >
            {renderOption(option)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FilterSidebar({
  categories,
  tags,
  roles,
}: {
  categories: Category[];
  tags: Tag[];
  roles: Role[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeCategory = searchParams.get("category") ? Number(searchParams.get("category")) : undefined;
  const activeTag = searchParams.get("tag") ? Number(searchParams.get("tag")) : undefined;
  const activeRole = searchParams.get("role") ? Number(searchParams.get("role")) : undefined;

  function setParam(key: string, id: number | undefined) {
    const params = new URLSearchParams(searchParams);
    if (id === undefined) {
      params.delete(key);
    } else {
      params.set(key, String(id));
    }
    params.set("page", "1");
    router.push(`/?${params.toString()}`);
  }

  const hasAnyFilter = activeCategory !== undefined || activeTag !== undefined || activeRole !== undefined;

  return (
    <aside className="flex w-full shrink-0 flex-col gap-5 sm:w-56">
      {hasAnyFilter && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => {
            const params = new URLSearchParams(searchParams);
            params.delete("category");
            params.delete("tag");
            params.delete("role");
            params.set("page", "1");
            router.push(`/?${params.toString()}`);
          }}
        >
          Clear all filters
        </Button>
      )}

      <FacetGroup
        label="Category"
        paramKey="category"
        options={categories}
        activeId={activeCategory}
        onSelect={(id) => setParam("category", id)}
        renderOption={(category) => <CategoryBadge category={category} />}
      />
      <FacetGroup
        label="Tag"
        paramKey="tag"
        options={tags}
        activeId={activeTag}
        onSelect={(id) => setParam("tag", id)}
        renderOption={(tag) => <TagChip tag={tag} />}
      />
      <FacetGroup
        label="Role"
        paramKey="role"
        options={roles}
        activeId={activeRole}
        onSelect={(id) => setParam("role", id)}
        renderOption={(role) => <TagChip tag={role} />}
      />
    </aside>
  );
}
