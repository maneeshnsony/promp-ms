"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { slugify } from "@/lib/utils";

interface Entity {
  id: number;
  name: string;
  slug: string;
  color?: string | null;
}

export function EntityManager<T extends Entity>({
  title,
  items,
  supportsColor = false,
  createAction,
  updateAction,
  deleteAction,
}: {
  title: string;
  items: T[];
  supportsColor?: boolean;
  createAction: (body: { name: string; slug: string; color?: string }) => Promise<T>;
  updateAction: (id: number, body: { name: string; slug: string; color?: string }) => Promise<T>;
  deleteAction: (id: number) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function openCreate() {
    setEditing(null);
    setName("");
    setColor("");
    setOpen(true);
  }

  function openEdit(item: T) {
    setEditing(item);
    setName(item.name);
    setColor(item.color ?? "");
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const body = { name, slug: slugify(name), ...(supportsColor && color ? { color } : {}) };
      if (editing) {
        await updateAction(editing.id, body);
        toast.success(`${title.slice(0, -1)} updated.`);
      } else {
        await createAction(body);
        toast.success(`${title.slice(0, -1)} created.`);
      }
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item: T) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await deleteAction(item.id);
      toast.success(`${title.slice(0, -1)} deleted.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>New {title.slice(0, -1).toLowerCase()}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{editing ? `Rename ${title.slice(0, -1).toLowerCase()}` : `New ${title.slice(0, -1).toLowerCase()}`}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="entity-name" className="text-sm font-medium text-foreground">
                  Name
                </label>
                <Input id="entity-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              {supportsColor && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="entity-color" className="text-sm font-medium text-foreground">
                    Color <span className="font-normal text-muted-foreground">(optional hex)</span>
                  </label>
                  <Input
                    id="entity-color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="#4f46e5"
                  />
                </div>
              )}
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : editing ? "Save changes" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No {title.toLowerCase()} yet — create one to get started.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-2">
                {supportsColor && item.color && (
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden
                  />
                )}
                <span className="text-sm text-foreground">{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.slug}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" aria-label={`Edit ${item.name}`} onClick={() => openEdit(item)}>
                  <Pencil size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${item.name}`}
                  onClick={() => handleDelete(item)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
