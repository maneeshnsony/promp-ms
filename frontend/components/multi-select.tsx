"use client";

import { useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface MultiSelectOption {
  id: number;
  name: string;
}

// Reused for category_ids / tag_ids / role_ids pickers in PromptFormDialog. Built on the
// already-installed Command/cmdk primitive per PHASE1-FRONTEND-DASHBOARD-PLAN.md step 6
// (no Popover component is installed, so this renders the list inline rather than behind
// a trigger — appropriate for a form with only a handful of options per facet).
export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  onCreate,
  inline = false,
}: {
  label: string;
  options: MultiSelectOption[];
  selected: number[];
  onChange: (ids: number[]) => void;
  /** When provided, typing a name with no match offers "Create <name>" — used to add a
   * new category/tag/role on the fly instead of forcing the user out to the manage pages. */
  onCreate?: (name: string) => Promise<MultiSelectOption>;
  /** Renders the label beside the search box in one row instead of stacked above it. */
  inline?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [creating, setCreating] = useState(false);

  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter((existing) => existing !== id) : [...selected, id]);
  }

  async function handleCreate() {
    const name = query.trim();
    if (!name || !onCreate) return;
    setCreating(true);
    try {
      const created = await onCreate(name);
      onChange([...selected, created.id]);
      setQuery("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create that.");
    } finally {
      setCreating(false);
    }
  }

  const selectedOptions = options.filter((option) => selected.includes(option.id));
  const showList = focused || query.length > 0;
  const trimmedQuery = query.trim();
  const hasExactMatch = options.some((option) => option.name.toLowerCase() === trimmedQuery.toLowerCase());
  const canCreate = Boolean(onCreate) && trimmedQuery.length > 0 && !hasExactMatch;

  const searchBox = (
    <Command className="rounded-lg! border border-input">
      <CommandInput
        placeholder={`Search ${label.toLowerCase()}...`}
        value={query}
        onValueChange={setQuery}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
      />
      {showList && (
        <CommandList className="max-h-40">
          {!canCreate && <CommandEmpty>No results.</CommandEmpty>}
          <CommandGroup>
            {options.map((option) => (
              <CommandItem
                key={option.id}
                value={option.name}
                data-checked={selected.includes(option.id)}
                onSelect={() => toggle(option.id)}
              >
                {option.name}
              </CommandItem>
            ))}
            {canCreate && (
              <CommandItem
                value={`__create__${trimmedQuery}`}
                disabled={creating}
                onSelect={handleCreate}
              >
                <PlusIcon />
                {creating ? "Creating..." : `Create "${trimmedQuery}"`}
              </CommandItem>
            )}
          </CommandGroup>
        </CommandList>
      )}
    </Command>
  );

  const badges = selectedOptions.length > 0 && (
    <div className="flex flex-wrap gap-1.5">
      {selectedOptions.map((option) => (
        <Badge key={option.id} variant="secondary" className="gap-1">
          {option.name}
          <button
            type="button"
            onClick={() => toggle(option.id)}
            aria-label={`Remove ${option.name}`}
            className="rounded-full hover:text-foreground"
          >
            <XIcon />
          </button>
        </Badge>
      ))}
    </div>
  );

  if (inline) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-sm font-medium text-foreground">{label}</span>
          <div className="flex-1">{searchBox}</div>
        </div>
        {badges}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {badges}
      {searchBox}
    </div>
  );
}
