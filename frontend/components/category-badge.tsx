import {
  BookOpen,
  ListChecks,
  PenTool,
  Hammer,
  TestTube,
  RefreshCw,
  Eye,
  GitBranch,
  Rocket,
  Bug,
  Database,
  Zap,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

// A fixed set of desaturated hues, auto-assigned round-robin per category id when the
// backend hasn't set an explicit `color` — see docs/PLAN.md's Design system section.
const PALETTE = [
  "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  "bg-lime-500/15 text-lime-700 dark:text-lime-300",
];

// Optional — only rendered when the category's `icon` field is set and matches a known
// name (per PHASE1-FRONTEND-DASHBOARD-PLAN.md step 3: "icon rendered via lucide-react if
// present"). Seed data never sets this today, so most categories render without an icon.
const ICONS: Record<string, LucideIcon> = {
  "book-open": BookOpen,
  "list-checks": ListChecks,
  "pen-tool": PenTool,
  hammer: Hammer,
  "test-tube": TestTube,
  "refresh-cw": RefreshCw,
  eye: Eye,
  "git-branch": GitBranch,
  rocket: Rocket,
  bug: Bug,
  database: Database,
  zap: Zap,
  layout: LayoutGrid,
};

export function CategoryBadge({ category }: { category: Category }) {
  const Icon = category.icon ? ICONS[category.icon.toLowerCase()] : undefined;
  const paletteClass = PALETTE[category.id % PALETTE.length];

  const style = category.color
    ? { backgroundColor: `${category.color}26`, color: category.color }
    : undefined;

  return (
    <Badge
      variant="outline"
      className={cn("border-transparent", !style && paletteClass)}
      style={style}
      data-slot="category-badge"
    >
      {Icon && <Icon aria-hidden />}
      {category.name}
    </Badge>
  );
}
