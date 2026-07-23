"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trackCopyAction } from "@/lib/actions";
import type { Prompt } from "@/lib/types";

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
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

export function PromptDetailDialog({
  prompt,
  open,
  onOpenChange,
}: {
  prompt: Prompt;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await writeClipboard(prompt.description);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    void trackCopyAction(prompt.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-8">{prompt.title}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto rounded-md border bg-muted/40 p-4">
          <p className="font-mono text-sm whitespace-pre-line text-foreground">{prompt.description}</p>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleCopy} aria-label="Copy prompt to clipboard">
            {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
