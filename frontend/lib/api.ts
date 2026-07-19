import { auth } from "@/auth";
import type { Category, Paginated, Prompt, PromptFormValues, PromptVersion, Role, Tag } from "@/lib/types";

const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const baseUrl =
    typeof window === "undefined"
      ? process.env.API_BASE_URL
      : process.env.NEXT_PUBLIC_API_BASE_URL;

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (!skipAuth) {
    const session = typeof window === "undefined" ? await auth() : null;
    if (session?.backendToken) {
      headers.set("Authorization", `Bearer ${session.backendToken}`);
    }
  }

  return fetch(`${baseUrl}${path}`, { ...options, headers });
}

interface Envelope<T> {
  status: "success" | "error";
  data: T;
  message?: string;
}

async function unwrap<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;

  if (!res.ok || body?.status === "error") {
    throw new Error(body?.message ?? `Request failed with status ${res.status}`);
  }

  return (body as Envelope<T>).data;
}

function toQueryString(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  return search.toString();
}

export interface PromptListParams {
  search?: string;
  category?: number;
  tag?: number;
  role?: number;
  pinned?: boolean;
  page?: number;
  per_page?: number;
}

export async function getPrompts(params: PromptListParams = {}): Promise<Paginated<Prompt>> {
  const qs = toQueryString(params as Record<string, string | number | boolean | undefined>);
  const res = await apiFetch(`/prompts${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load prompts (${res.status})`);
  return res.json() as Promise<Paginated<Prompt>>;
}

export async function createPrompt(body: PromptFormValues): Promise<Prompt> {
  const res = await apiFetch("/prompts", { method: "POST", body: JSON.stringify(body) });
  return unwrap<Prompt>(res);
}

export async function updatePrompt(id: number, body: Partial<PromptFormValues>): Promise<Prompt> {
  const res = await apiFetch(`/prompts/${id}`, { method: "PUT", body: JSON.stringify(body) });
  return unwrap<Prompt>(res);
}

export async function deletePrompt(id: number): Promise<void> {
  const res = await apiFetch(`/prompts/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete prompt (${res.status})`);
}

export async function getCategories(): Promise<Category[]> {
  const res = await apiFetch("/categories", { cache: "no-store" });
  return unwrap<Category[]>(res);
}

export async function getTags(): Promise<Tag[]> {
  const res = await apiFetch("/tags", { cache: "no-store" });
  return unwrap<Tag[]>(res);
}

export async function getRoles(): Promise<Role[]> {
  const res = await apiFetch("/roles", { cache: "no-store" });
  return unwrap<Role[]>(res);
}

export async function getPromptVersions(id: number): Promise<PromptVersion[]> {
  const res = await apiFetch(`/prompts/${id}/versions`, { cache: "no-store" });
  return unwrap<PromptVersion[]>(res);
}

export interface EntityInput {
  name: string;
  slug: string;
  icon?: string;
  color?: string;
}

function entityCrud<T>(resource: "categories" | "tags" | "roles") {
  return {
    create: async (body: EntityInput): Promise<T> => {
      const res = await apiFetch(`/${resource}`, { method: "POST", body: JSON.stringify(body) });
      return unwrap<T>(res);
    },
    update: async (id: number, body: Partial<EntityInput>): Promise<T> => {
      const res = await apiFetch(`/${resource}/${id}`, { method: "PUT", body: JSON.stringify(body) });
      return unwrap<T>(res);
    },
    delete: async (id: number): Promise<void> => {
      const res = await apiFetch(`/${resource}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Failed to delete (${res.status})`);
    },
  };
}

const categoryCrud = entityCrud<Category>("categories");
export const createCategory = categoryCrud.create;
export const updateCategory = categoryCrud.update;
export const deleteCategory = categoryCrud.delete;

const tagCrud = entityCrud<Tag>("tags");
export const createTag = tagCrud.create;
export const updateTag = tagCrud.update;
export const deleteTag = tagCrud.delete;

const roleCrud = entityCrud<Role>("roles");
export const createRole = roleCrud.create;
export const updateRole = roleCrud.update;
export const deleteRole = roleCrud.delete;
