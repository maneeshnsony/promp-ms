"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, createPrompt, updatePrompt } from "@/lib/api";
import type { Prompt, PromptFormValues } from "@/lib/types";

// apiFetch only attaches the Authorization header on the server (see lib/api.ts) —
// on the client it's silently omitted even with an active session. PromptCard's copy
// button and PromptFormDialog's submit handler are client components, so their writes
// are routed through these Server Actions instead of calling apiFetch directly; running
// server-side lets `auth()` resolve normally and the bearer token attach correctly.

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
