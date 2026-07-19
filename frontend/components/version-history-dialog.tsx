"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getPromptVersions } from "@/lib/api";
import type { PromptVersion } from "@/lib/types";

function relativeTime(iso: string) {
  const diffMs = new Date(iso).getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const diffMinutes = Math.round(diffMs / 60000);
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, "day");
}

export function VersionHistoryDialog({
  promptId,
  open,
  onOpenChange,
}: {
  promptId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [versions, setVersions] = useState<PromptVersion[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function load() {
      if (cancelled) return;
      setVersions(null);
      setError(false);
      try {
        const result = await getPromptVersions(promptId);
        if (!cancelled) setVersions(result);
      } catch {
        if (!cancelled) {
          setError(true);
          toast.error("Failed to load version history.");
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, promptId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription>Prior snapshots of this prompt, newest first.</DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
          {error && <p className="text-sm text-muted-foreground">Couldn&apos;t load version history.</p>}
          {!error && versions === null && (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          )}
          {!error && versions?.length === 0 && (
            <p className="text-sm text-muted-foreground">No edits yet.</p>
          )}
          {!error &&
            versions?.map((version) => (
              <div key={version.id} className="rounded-md border p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{version.title}</span>
                  <span className="text-xs text-muted-foreground">{relativeTime(version.edited_at)}</span>
                </div>
                <p className="line-clamp-3 font-mono text-xs whitespace-pre-line text-muted-foreground">
                  {version.description}
                </p>
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
