"use client";

import { useState } from "react";
import { Copy, Check, Pin, Info, Pencil, History, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/category-badge";
import { TagChip } from "@/components/tag-chip";
import { PromptFormDialog } from "@/components/prompt-form-dialog";
import { SlotFillDialog } from "@/components/slot-fill-dialog";
import { VersionHistoryDialog } from "@/components/version-history-dialog";
import { deletePromptAction, trackCopyAction } from "@/lib/actions";
import { extractSlots } from "@/lib/slots";
import type { Category, Prompt, Role, Tag } from "@/lib/types";

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for browsers/contexts without the Clipboard API.
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
}

export function PromptCard({
  prompt,
  categories,
  tags,
  roles,
}: {
  prompt: Prompt;
  categories: Category[];
  tags: Tag[];
  roles: Role[];
}) {
  const [copied, setCopied] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const slots = extractSlots(prompt.description);

  function markCopied() {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    void trackCopyAction(prompt.id); // fire-and-forget — never blocks the copy feedback
  }

  async function handleCopyClick() {
    if (slots.length > 0) {
      setSlotDialogOpen(true);
      return;
    }
    await writeClipboard(prompt.description);
    markCopied();
  }

  async function handleSlotCopy(filledText: string) {
    await writeClipboard(filledText);
    setSlotDialogOpen(false);
    markCopied();
  }

  async function handleDelete() {
    if (!confirm(`Delete "${prompt.title}"? This can't be undone.`)) return;

    setDeleting(true);
    try {
      await deletePromptAction(prompt.id);
      toast.success("Prompt deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete prompt.");
      setDeleting(false);
    }
  }

  return (
    <Card>
      {prompt.is_pinned && (
        <Pin
          size={14}
          className="absolute -top-1.5 -left-1.5 rotate-45 text-primary"
          aria-label="Pinned — start here"
        />
      )}

      <CardHeader>
        <CardTitle>{prompt.title}</CardTitle>
        <div className="flex shrink-0 items-center gap-1">
          <PromptFormDialog
            mode="edit"
            prompt={prompt}
            categories={categories}
            tags={tags}
            roles={roles}
            trigger={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Edit prompt"
                className="opacity-0 group-hover:opacity-100"
              >
                <Pencil size={16} />
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="View version history"
            className="opacity-0 group-hover:opacity-100"
            onClick={() => setHistoryOpen(true)}
          >
            <History size={16} />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Copy prompt to clipboard" onClick={handleCopyClick}>
            {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete prompt"
            className="opacity-0 group-hover:opacity-100"
            disabled={deleting}
            onClick={handleDelete}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <p className="line-clamp-3 font-mono text-sm whitespace-pre-line text-muted-foreground">
          {prompt.description}
        </p>

        {prompt.notes && (
          <button
            type="button"
            onClick={() => setShowNotes((v) => !v)}
            className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Info size={12} /> Why this works
          </button>
        )}
        {showNotes && prompt.notes && (
          <p className="mt-1 text-xs text-muted-foreground">{prompt.notes}</p>
        )}
      </CardContent>

      {(prompt.categories.length > 0 || prompt.tags.length > 0) && (
        <CardFooter>
          {prompt.categories.map((c) => (
            <CategoryBadge key={c.id} category={c} />
          ))}
          {prompt.tags.map((t) => (
            <TagChip key={t.id} tag={t} />
          ))}
        </CardFooter>
      )}

      <SlotFillDialog
        open={slotDialogOpen}
        onOpenChange={setSlotDialogOpen}
        description={prompt.description}
        slots={slots}
        onCopy={handleSlotCopy}
      />
      <VersionHistoryDialog promptId={prompt.id} open={historyOpen} onOpenChange={setHistoryOpen} />
    </Card>
  );
}
