"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fillSlots } from "@/lib/slots";

export function SlotFillDialog({
  open,
  onOpenChange,
  description,
  slots,
  onCopy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  slots: string[];
  onCopy: (filledText: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});

  const allFilled = slots.every((slot) => values[slot]?.trim());
  const preview = fillSlots(description, values);

  function handleOpenChange(next: boolean) {
    if (next) {
      setValues({});
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Fill in placeholders</DialogTitle>
          <DialogDescription>Fill every field to copy the completed prompt.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {slots.map((slot) => (
            <div key={slot} className="flex flex-col gap-1.5">
              <label htmlFor={`slot-${slot}`} className="text-sm font-medium text-foreground">
                {slot}
              </label>
              <Input
                id={`slot-${slot}`}
                value={values[slot] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [slot]: e.target.value }))}
              />
            </div>
          ))}

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Preview</span>
            <p className="max-h-40 overflow-y-auto rounded-md border bg-muted/40 p-3 font-mono text-sm whitespace-pre-line text-muted-foreground">
              {preview}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button disabled={!allFilled} onClick={() => onCopy(preview)}>
            Copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
