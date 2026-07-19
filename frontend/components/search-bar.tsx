"use client";

import { useEffect, useRef, useState } from "react";
import { SearchIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

const DEBOUNCE_MS = 300;

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlValue = searchParams.get("search") ?? "";
  const [value, setValue] = useState(urlValue);
  const [lastUrlValue, setLastUrlValue] = useState(urlValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the input in sync with back/forward navigation and external URL edits, without
  // a setState-in-effect (derived-state-during-render, per React's own guidance).
  if (urlValue !== lastUrlValue) {
    setLastUrlValue(urlValue);
    setValue(urlValue);
  }

  function handleChange(next: string) {
    setValue(next);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (next) {
        params.set("search", next);
      } else {
        params.delete("search");
      }
      params.set("page", "1");
      router.push(`/?${params.toString()}`);
    }, DEBOUNCE_MS);
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <InputGroup className="max-w-sm">
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search prompts..."
        aria-label="Search prompts"
      />
    </InputGroup>
  );
}
