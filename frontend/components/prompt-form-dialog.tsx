"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect } from "@/components/multi-select";
import { createPromptAction, updatePromptAction } from "@/lib/actions";
import type { Category, Prompt, Role, Tag } from "@/lib/types";

interface PromptFormDialogProps {
  mode: "create" | "edit";
  prompt?: Prompt;
  categories: Category[];
  tags: Tag[];
  roles: Role[];
  trigger: ReactNode;
}

function emptyState(prompt?: Prompt) {
  return {
    title: prompt?.title ?? "",
    description: prompt?.description ?? "",
    notes: prompt?.notes ?? "",
    categoryIds: prompt?.categories.map((c) => c.id) ?? [],
    tagIds: prompt?.tags.map((t) => t.id) ?? [],
    roleIds: prompt?.roles.map((r) => r.id) ?? [],
  };
}

export function PromptFormDialog({ mode, prompt, categories, tags, roles, trigger }: PromptFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState(() => emptyState(prompt));

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      // Re-sync from the latest prompt (edit) or blank out (create) each time it opens.
      setValues(emptyState(prompt));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.title.trim() || !values.description.trim()) {
      toast.error("Title and description are required.");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        title: values.title,
        description: values.description,
        notes: values.notes || undefined,
        category_ids: values.categoryIds,
        tag_ids: values.tagIds,
        role_ids: values.roleIds,
      };

      if (mode === "create") {
        await createPromptAction(body);
        toast.success("Prompt created.");
      } else if (prompt) {
        await updatePromptAction(prompt.id, body);
        toast.success("Prompt updated.");
      }

      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New prompt" : "Edit prompt"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a prompt to the library."
              : "Update this prompt — the previous title and description are kept in its version history."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto px-1">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="prompt-title" className="text-sm font-medium text-foreground">
              Title
            </label>
            <Input
              id="prompt-title"
              value={values.title}
              onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="prompt-description" className="text-sm font-medium text-foreground">
              Description
            </label>
            <Textarea
              id="prompt-description"
              className="min-h-32 font-mono"
              value={values.description}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="prompt-notes" className="text-sm font-medium text-foreground">
              Notes <span className="font-normal text-muted-foreground">(optional — &quot;why this works&quot;)</span>
            </label>
            <Textarea
              id="prompt-notes"
              value={values.notes}
              onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
            />
          </div>

          <MultiSelect
            label="Categories"
            options={categories}
            selected={values.categoryIds}
            onChange={(ids) => setValues((v) => ({ ...v, categoryIds: ids }))}
          />
          <MultiSelect
            label="Tags"
            options={tags}
            selected={values.tagIds}
            onChange={(ids) => setValues((v) => ({ ...v, tagIds: ids }))}
          />
          <MultiSelect
            label="Roles"
            options={roles}
            selected={values.roleIds}
            onChange={(ids) => setValues((v) => ({ ...v, roleIds: ids }))}
          />

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : mode === "create" ? "Create prompt" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
