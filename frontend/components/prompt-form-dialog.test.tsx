import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const routerRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefresh }),
}));

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastError } }));

const {
  createPromptAction,
  updatePromptAction,
  createCategoryAction,
  createRoleAction,
  createTagAction,
} = vi.hoisted(() => ({
  createPromptAction: vi.fn(),
  updatePromptAction: vi.fn(),
  createCategoryAction: vi.fn(),
  createRoleAction: vi.fn(),
  createTagAction: vi.fn(),
}));
vi.mock("@/lib/actions", () => ({
  createPromptAction,
  updatePromptAction,
  createCategoryAction,
  createRoleAction,
  createTagAction,
}));

import { PromptFormDialog } from "@/components/prompt-form-dialog";
import type { Prompt } from "@/lib/types";

function makePrompt(overrides: Partial<Prompt> = {}): Prompt {
  return {
    id: 1,
    title: "Original title",
    description: "Original description",
    notes: null,
    is_pinned: false,
    copy_count: 0,
    categories: [],
    tags: [],
    roles: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const categories = [
  { id: 1, name: "Marketing", slug: "marketing", icon: null, color: null },
  { id: 2, name: "Engineering", slug: "engineering", icon: null, color: null },
];
const tags = [{ id: 10, name: "Draft", slug: "draft" }];
const roles = [{ id: 20, name: "Writer", slug: "writer" }];

async function openDialog() {
  await userEvent.click(screen.getByRole("button", { name: "Open" }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PromptFormDialog - create mode", () => {
  function renderCreate() {
    return render(
      <PromptFormDialog
        mode="create"
        categories={categories}
        tags={tags}
        roles={roles}
        trigger={<button>Open</button>}
      />
    );
  }

  it("renders a blank form", async () => {
    renderCreate();
    await openDialog();

    expect(screen.getByLabelText("Title")).toHaveValue("");
    expect(screen.getByLabelText("Description")).toHaveValue("");
    expect(screen.getByRole("heading", { name: "New prompt" })).toBeInTheDocument();
  });

  it("blocks submission and shows a toast when title/description are whitespace-only", async () => {
    renderCreate();
    await openDialog();

    // Native `required` only blocks truly-empty fields, so use whitespace to reach the
    // component's own trim()-based validation.
    await userEvent.type(screen.getByLabelText("Title"), " ");
    await userEvent.type(screen.getByLabelText("Description"), " ");
    await userEvent.click(screen.getByRole("button", { name: "Create prompt" }));

    expect(toastError).toHaveBeenCalledWith("Title and description are required.");
    expect(createPromptAction).not.toHaveBeenCalled();
  });

  it("submits, shows a success toast, closes, and refreshes on success", async () => {
    createPromptAction.mockResolvedValue({ id: 5 });
    renderCreate();
    await openDialog();

    await userEvent.type(screen.getByLabelText("Title"), "New title");
    await userEvent.type(screen.getByLabelText("Description"), "New description");
    await userEvent.click(screen.getByRole("button", { name: "Create prompt" }));

    expect(createPromptAction).toHaveBeenCalledWith({
      title: "New title",
      description: "New description",
      notes: undefined,
      category_ids: [],
      tag_ids: [],
      role_ids: [],
    });
    expect(toastSuccess).toHaveBeenCalledWith("Prompt created.");
    expect(routerRefresh).toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "New prompt" })).not.toBeInTheDocument();
  });

  it("surfaces the error message and keeps the dialog open on failure", async () => {
    createPromptAction.mockRejectedValue(new Error("Title already exists."));
    renderCreate();
    await openDialog();

    await userEvent.type(screen.getByLabelText("Title"), "New title");
    await userEvent.type(screen.getByLabelText("Description"), "New description");
    await userEvent.click(screen.getByRole("button", { name: "Create prompt" }));

    expect(toastError).toHaveBeenCalledWith("Title already exists.");
    expect(screen.getByRole("heading", { name: "New prompt" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create prompt" })).toBeEnabled();
  });

  it("creates a new category inline via MultiSelect and includes it on submit", async () => {
    createCategoryAction.mockResolvedValue({
      id: 3,
      name: "Sales",
      slug: "sales",
      icon: null,
      color: null,
    });
    createPromptAction.mockResolvedValue({ id: 5 });
    renderCreate();
    await openDialog();

    await userEvent.type(screen.getByLabelText("Title"), "T");
    await userEvent.type(screen.getByLabelText("Description"), "D");

    await userEvent.type(screen.getByPlaceholderText("Search categories..."), "Sales");
    await userEvent.click(screen.getByText('Create "Sales"'));

    expect(createCategoryAction).toHaveBeenCalledWith({ name: "Sales", slug: "sales" });
    expect(screen.getByLabelText("Remove Sales")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Create prompt" }));

    expect(createPromptAction).toHaveBeenCalledWith(
      expect.objectContaining({ category_ids: [3] })
    );
  });

  it("includes typed notes in the submitted body", async () => {
    createPromptAction.mockResolvedValue({ id: 5 });
    renderCreate();
    await openDialog();

    await userEvent.type(screen.getByLabelText("Title"), "T");
    await userEvent.type(screen.getByLabelText("Description"), "D");
    await userEvent.type(screen.getByLabelText(/Notes/), "Because it works.");
    await userEvent.click(screen.getByRole("button", { name: "Create prompt" }));

    expect(createPromptAction).toHaveBeenCalledWith(
      expect.objectContaining({ notes: "Because it works." })
    );
  });

  it("creates a new role inline via the (inline) MultiSelect and includes it on submit", async () => {
    createRoleAction.mockResolvedValue({ id: 21, name: "Reviewer", slug: "reviewer" });
    createPromptAction.mockResolvedValue({ id: 5 });
    renderCreate();
    await openDialog();

    await userEvent.type(screen.getByLabelText("Title"), "T");
    await userEvent.type(screen.getByLabelText("Description"), "D");

    await userEvent.type(screen.getByPlaceholderText("Search roles..."), "Reviewer");
    await userEvent.click(screen.getByText('Create "Reviewer"'));

    expect(createRoleAction).toHaveBeenCalledWith({ name: "Reviewer", slug: "reviewer" });
    expect(screen.getByLabelText("Remove Reviewer")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Create prompt" }));

    expect(createPromptAction).toHaveBeenCalledWith(expect.objectContaining({ role_ids: [21] }));
  });

  it("creates a new tag inline via the (inline) MultiSelect and includes it on submit", async () => {
    createTagAction.mockResolvedValue({ id: 11, name: "Urgent", slug: "urgent" });
    createPromptAction.mockResolvedValue({ id: 5 });
    renderCreate();
    await openDialog();

    await userEvent.type(screen.getByLabelText("Title"), "T");
    await userEvent.type(screen.getByLabelText("Description"), "D");

    await userEvent.type(screen.getByPlaceholderText("Search tags..."), "Urgent");
    await userEvent.click(screen.getByText('Create "Urgent"'));

    expect(createTagAction).toHaveBeenCalledWith({ name: "Urgent", slug: "urgent" });
    expect(screen.getByLabelText("Remove Urgent")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Create prompt" }));

    expect(createPromptAction).toHaveBeenCalledWith(expect.objectContaining({ tag_ids: [11] }));
  });
});

describe("PromptFormDialog - edit mode", () => {
  it("pre-fills from the prompt prop", async () => {
    const prompt = makePrompt({
      notes: "Some notes",
      categories: [categories[0]],
      tags: [tags[0]],
      roles: [roles[0]],
    });
    render(
      <PromptFormDialog
        mode="edit"
        prompt={prompt}
        categories={categories}
        tags={tags}
        roles={roles}
        trigger={<button>Open</button>}
      />
    );
    await openDialog();

    expect(screen.getByLabelText("Title")).toHaveValue("Original title");
    expect(screen.getByLabelText("Description")).toHaveValue("Original description");
    expect(screen.getByLabelText(/Notes/)).toHaveValue("Some notes");
    expect(screen.getByRole("heading", { name: "Edit prompt" })).toBeInTheDocument();
    expect(screen.getAllByText("Marketing").length).toBeGreaterThan(0);
  });

  it("submits the update and closes on success", async () => {
    const prompt = makePrompt();
    updatePromptAction.mockResolvedValue({ ...prompt, title: "Changed" });
    render(
      <PromptFormDialog
        mode="edit"
        prompt={prompt}
        categories={categories}
        tags={tags}
        roles={roles}
        trigger={<button>Open</button>}
      />
    );
    await openDialog();

    await userEvent.clear(screen.getByLabelText("Title"));
    await userEvent.type(screen.getByLabelText("Title"), "Changed");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updatePromptAction).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ title: "Changed" })
    );
    expect(toastSuccess).toHaveBeenCalledWith("Prompt updated.");
    expect(routerRefresh).toHaveBeenCalled();
  });

  it("re-syncs form values from the latest prompt prop each time it reopens", async () => {
    const promptA = makePrompt({ id: 1, title: "A" });
    const { rerender } = render(
      <PromptFormDialog
        mode="edit"
        prompt={promptA}
        categories={categories}
        tags={tags}
        roles={roles}
        trigger={<button>Open</button>}
      />
    );

    await openDialog();
    expect(screen.getByLabelText("Title")).toHaveValue("A");

    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    const promptB = makePrompt({ id: 2, title: "B" });
    rerender(
      <PromptFormDialog
        mode="edit"
        prompt={promptB}
        categories={categories}
        tags={tags}
        roles={roles}
        trigger={<button>Open</button>}
      />
    );

    await openDialog();
    expect(screen.getByLabelText("Title")).toHaveValue("B");
  });
});
