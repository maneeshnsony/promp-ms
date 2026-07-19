"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, Columns2, Columns3, Grid2x2 } from "lucide-react";

import { PromptCard } from "@/components/prompt-card";
import { cn } from "@/lib/utils";
import type { Category, Prompt, Role, Tag } from "@/lib/types";

const COLUMN_OPTIONS = [1, 2, 3, 4] as const;
const COLUMN_ICONS = {
  1: LayoutGrid,
  2: Columns2,
  3: Columns3,
  4: Grid2x2,
} as const;
const STORAGE_KEY = "prompt-grid-columns";
const DEFAULT_COLUMNS = 1;

export function PromptGrid({
  prompts,
  categories,
  tags,
  roles,
}: {
  prompts: Prompt[];
  categories: Category[];
  tags: Tag[];
  roles: Role[];
}) {
  // Starts at DEFAULT_COLUMNS to match server-rendered markup, then syncs from localStorage
  // post-mount — reading localStorage during the initial render would mismatch hydration.
  const [columns, setColumns] = useState<number>(DEFAULT_COLUMNS);

  useEffect(() => {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    if (COLUMN_OPTIONS.includes(stored as (typeof COLUMN_OPTIONS)[number]) && stored !== DEFAULT_COLUMNS) {
      // One-time sync from localStorage on mount; this is exactly what an effect is for,
      // and the value can't be known during SSR/initial render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setColumns(stored);
    }
  }, []);

  function selectColumns(count: number) {
    setColumns(count);
    localStorage.setItem(STORAGE_KEY, String(count));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-1" role="group" aria-label="Card columns">
        {COLUMN_OPTIONS.map((count) => {
          const Icon = COLUMN_ICONS[count];
          return (
            <button
              key={count}
              type="button"
              onClick={() => selectColumns(count)}
              aria-label={`Show ${count} column${count === 1 ? "" : "s"}`}
              aria-pressed={columns === count}
              className={cn(
                "flex size-7 items-center justify-center rounded-md border transition-colors",
                columns === count
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={16} />
            </button>
          );
        })}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {prompts.map((prompt) => (
          <PromptCard key={prompt.id} prompt={prompt} categories={categories} tags={tags} roles={roles} />
        ))}
      </div>
    </div>
  );
}
