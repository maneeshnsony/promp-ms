"use server";

import { revalidatePath } from "next/cache";
import {
  apiFetch,
  createCategory,
  createPrompt,
  createRole,
  createTag,
  deleteCategory,
  deletePrompt,
  deleteRole,
  deleteTag,
  getPromptVersions,
  updateCategory,
  updatePrompt,
  updateRole,
  updateTag,
  type EntityInput,
} from "@/lib/api";
import type { Category, Prompt, PromptFormValues, PromptVersion, Role, Tag } from "@/lib/types";

// apiFetch only attaches the Authorization header on the server (see lib/api.ts) —
// on the client it's silently omitted even with an active session. PromptCard's copy
// button, PromptFormDialog's submit handler, and VersionHistoryDialog's fetch are all
// client components, so their reads/writes are routed through these Server Actions
// instead of calling apiFetch directly; running server-side lets `auth()` resolve
// normally and the bearer token attach correctly.

/** Fire-and-forget from the client — never throws, never blocks the copy feedback. */
export async function trackCopyAction(promptId: number): Promise<void> {
  try {
    await apiFetch(`/prompts/${promptId}/copy`, { method: "POST" });
  } catch {
    // best-effort only
  }
}

export async function createPromptAction(body: PromptFormValues): Promise<Prompt> {
  const prompt = await createPrompt(body);
  revalidatePath("/");
  return prompt;
}

export async function updatePromptAction(id: number, body: Partial<PromptFormValues>): Promise<Prompt> {
  const prompt = await updatePrompt(id, body);
  revalidatePath("/");
  return prompt;
}

export async function deletePromptAction(id: number): Promise<void> {
  await deletePrompt(id);
  revalidatePath("/");
}

export async function getPromptVersionsAction(id: number): Promise<PromptVersion[]> {
  return getPromptVersions(id);
}

export async function createCategoryAction(body: EntityInput): Promise<Category> {
  const category = await createCategory(body);
  revalidatePath("/categories");
  revalidatePath("/");
  return category;
}

export async function updateCategoryAction(id: number, body: Partial<EntityInput>): Promise<Category> {
  const category = await updateCategory(id, body);
  revalidatePath("/categories");
  revalidatePath("/");
  return category;
}

export async function deleteCategoryAction(id: number): Promise<void> {
  await deleteCategory(id);
  revalidatePath("/categories");
  revalidatePath("/");
}

export async function createTagAction(body: EntityInput): Promise<Tag> {
  const tag = await createTag(body);
  revalidatePath("/tags");
  revalidatePath("/");
  return tag;
}

export async function updateTagAction(id: number, body: Partial<EntityInput>): Promise<Tag> {
  const tag = await updateTag(id, body);
  revalidatePath("/tags");
  revalidatePath("/");
  return tag;
}

export async function deleteTagAction(id: number): Promise<void> {
  await deleteTag(id);
  revalidatePath("/tags");
  revalidatePath("/");
}

export async function createRoleAction(body: EntityInput): Promise<Role> {
  const role = await createRole(body);
  revalidatePath("/roles");
  revalidatePath("/");
  return role;
}

export async function updateRoleAction(id: number, body: Partial<EntityInput>): Promise<Role> {
  const role = await updateRole(id, body);
  revalidatePath("/roles");
  revalidatePath("/");
  return role;
}

export async function deleteRoleAction(id: number): Promise<void> {
  await deleteRole(id);
  revalidatePath("/roles");
  revalidatePath("/");
}
