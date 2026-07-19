import Link from "next/link";

import { Button } from "@/components/ui/button";

export function EmptyState({ hasActiveFilters }: { hasActiveFilters: boolean }) {
  if (hasActiveFilters) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No prompts match your current search or filters.
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/">Clear filters</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <p className="text-sm text-muted-foreground">No prompts yet — create one to get started.</p>
    </div>
  );
}
