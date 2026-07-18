"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

export function Pagination({ page, perPage, total }: { page: number; perPage: number; total: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lastPage = Math.max(1, Math.ceil(total / perPage));

  function goTo(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(nextPage));
    router.push(`/?${next.toString()}`);
  }

  if (total === 0) {
    return null;
  }

  return (
    <div className="mt-6 flex items-center justify-center gap-3 text-sm">
      <Button variant="outline" disabled={page <= 1} onClick={() => goTo(page - 1)}>
        Previous
      </Button>
      <span className="text-muted-foreground">
        Page {page} of {lastPage}
      </span>
      <Button variant="outline" disabled={page >= lastPage} onClick={() => goTo(page + 1)}>
        Next
      </Button>
    </div>
  );
}
