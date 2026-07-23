import { describe, expect, it, vi, beforeEach } from "vitest";

const {
  apiFetch,
  createPrompt,
  updatePrompt,
  deletePrompt,
  createCategory,
  updateCategory,
  deleteCategory,
  createTag,
  updateTag,
  deleteTag,
  createRole,
  updateRole,
  deleteRole,
  getPromptVersions,
  revalidatePath,
} = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  createPrompt: vi.fn(),
  updatePrompt: vi.fn(),
  deletePrompt: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  createTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
  createRole: vi.fn(),
  updateRole: vi.fn(),
  deleteRole: vi.fn(),
  getPromptVersions: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiFetch,
  createPrompt,
  updatePrompt,
  deletePrompt,
  createCategory,
  updateCategory,
  deleteCategory,
  createTag,
  updateTag,
  deleteTag,
  createRole,
  updateRole,
  deleteRole,
  getPromptVersions,
}));
vi.mock("next/cache", () => ({ revalidatePath }));

import {
  createPromptAction,
  updatePromptAction,
  deletePromptAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  createTagAction,
  updateTagAction,
  deleteTagAction,
  createRoleAction,
  updateRoleAction,
  deleteRoleAction,
  trackCopyAction,
  getPromptVersionsAction,
} from "@/lib/actions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("prompt actions", () => {
  it("createPromptAction creates the prompt and revalidates /", async () => {
    createPrompt.mockResolvedValue({ id: 1, title: "T" });

    const result = await createPromptAction({ title: "T", description: "D" });

    expect(createPrompt).toHaveBeenCalledWith({ title: "T", description: "D" });
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: 1, title: "T" });
  });

  it("updatePromptAction updates the prompt and revalidates /", async () => {
    updatePrompt.mockResolvedValue({ id: 1, title: "Updated" });

    const result = await updatePromptAction(1, { title: "Updated" });

    expect(updatePrompt).toHaveBeenCalledWith(1, { title: "Updated" });
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(result).toEqual({ id: 1, title: "Updated" });
  });

  it("deletePromptAction deletes and revalidates /", async () => {
    deletePrompt.mockResolvedValue(undefined);

    await deletePromptAction(1);

    expect(deletePrompt).toHaveBeenCalledWith(1);
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });
});

describe("entity actions revalidate both their list page and /", () => {
  const cases: Array<{
    label: string;
    run: () => Promise<unknown>;
    apiFn: ReturnType<typeof vi.fn>;
    listPath: string;
  }> = [
    {
      label: "createCategoryAction",
      run: () => createCategoryAction({ name: "N", slug: "n" }),
      apiFn: createCategory,
      listPath: "/categories",
    },
    {
      label: "updateCategoryAction",
      run: () => updateCategoryAction(1, { name: "N" }),
      apiFn: updateCategory,
      listPath: "/categories",
    },
    {
      label: "deleteCategoryAction",
      run: () => deleteCategoryAction(1),
      apiFn: deleteCategory,
      listPath: "/categories",
    },
    {
      label: "createTagAction",
      run: () => createTagAction({ name: "N", slug: "n" }),
      apiFn: createTag,
      listPath: "/tags",
    },
    {
      label: "updateTagAction",
      run: () => updateTagAction(1, { name: "N" }),
      apiFn: updateTag,
      listPath: "/tags",
    },
    {
      label: "deleteTagAction",
      run: () => deleteTagAction(1),
      apiFn: deleteTag,
      listPath: "/tags",
    },
    {
      label: "createRoleAction",
      run: () => createRoleAction({ name: "N", slug: "n" }),
      apiFn: createRole,
      listPath: "/roles",
    },
    {
      label: "updateRoleAction",
      run: () => updateRoleAction(1, { name: "N" }),
      apiFn: updateRole,
      listPath: "/roles",
    },
    {
      label: "deleteRoleAction",
      run: () => deleteRoleAction(1),
      apiFn: deleteRole,
      listPath: "/roles",
    },
  ];

  it.each(cases)("$label calls its api function and revalidates $listPath then /", async ({
    run,
    apiFn,
    listPath,
  }) => {
    apiFn.mockResolvedValue({ id: 1 });

    await run();

    expect(apiFn).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenNthCalledWith(1, listPath);
    expect(revalidatePath).toHaveBeenNthCalledWith(2, "/");
    expect(revalidatePath).toHaveBeenCalledTimes(2);
  });
});

describe("getPromptVersionsAction", () => {
  it("fetches version history server-side so the bearer token attaches (unlike a direct client apiFetch call)", async () => {
    const versions = [{ id: 1, title: "T", description: "D", edited_at: "2026-01-01T00:00:00Z" }];
    getPromptVersions.mockResolvedValue(versions);

    const result = await getPromptVersionsAction(5);

    expect(getPromptVersions).toHaveBeenCalledWith(5);
    expect(result).toEqual(versions);
  });
});

describe("trackCopyAction", () => {
  it("posts to the copy endpoint", async () => {
    apiFetch.mockResolvedValue({ ok: true });

    await trackCopyAction(42);

    expect(apiFetch).toHaveBeenCalledWith("/prompts/42/copy", { method: "POST" });
  });

  it("never throws, even when apiFetch rejects (best-effort only)", async () => {
    apiFetch.mockRejectedValue(new Error("network down"));

    await expect(trackCopyAction(42)).resolves.toBeUndefined();
  });
});
