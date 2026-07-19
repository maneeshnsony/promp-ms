"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";

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
}: {
  label: string;
  options: MultiSelectOption[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter((existing) => existing !== id) : [...selected, id]);
  }

  const selectedOptions = options.filter((option) => selected.includes(option.id));
  const showList = focused || query.length > 0;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>

      {selectedOptions.length > 0 && (
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
      )}

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
            <CommandEmpty>No results.</CommandEmpty>
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
            </CommandGroup>
          </CommandList>
        )}
      </Command>
    </div>
  );
}
