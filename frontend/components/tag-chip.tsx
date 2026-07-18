import { Badge } from "@/components/ui/badge";
import type { Tag } from "@/lib/types";

// Plain neutral gray, deliberately no color per docs/PLAN.md's Design system section:
// tags are numerous and ad hoc, so color is reserved for categories/roles instead.
export function TagChip({ tag }: { tag: Tag }) {
  return (
    <Badge variant="secondary" data-slot="tag-chip">
      {tag.name}
    </Badge>
  );
}
