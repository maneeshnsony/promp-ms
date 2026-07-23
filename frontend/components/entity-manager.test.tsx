import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastError } }));

import { TooltipProvider } from "@/components/ui/tooltip";
import { EntityManager } from "@/components/entity-manager";

interface Item {
  id: number;
  name: string;
  slug: string;
  color?: string | null;
}

function renderManager(overrides: Partial<Parameters<typeof EntityManager>[0]> = {}) {
  const createAction = vi.fn();
  const updateAction = vi.fn();
  const deleteAction = vi.fn();
  const utils = render(
    <TooltipProvider>
      <EntityManager<Item>
        title="Tags"
        items={[]}
        createAction={createAction}
        updateAction={updateAction}
        deleteAction={deleteAction}
        {...overrides}
      />
    </TooltipProvider>
  );
  return { ...utils, createAction, updateAction, deleteAction };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("EntityManager", () => {
  it("shows an empty-state message when there are no items", () => {
    renderManager({ items: [] });

    expect(screen.getByText("No tags yet — create one to get started.")).toBeInTheDocument();
  });

  it("renders each item's name and slug", () => {
    renderManager({
      items: [
        { id: 1, name: "Draft", slug: "draft" },
        { id: 2, name: "Final", slug: "final" },
      ],
    });

    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
    expect(screen.getByText("Final")).toBeInTheDocument();
  });

  it("requires a name before creating", async () => {
    const { createAction } = renderManager();

    await userEvent.click(screen.getByRole("button", { name: "New tag" }));
    // Native `required` only blocks truly-empty fields, so use whitespace to reach the
    // component's own trim()-based validation.
    await userEvent.type(screen.getByLabelText("Name"), " ");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(toastError).toHaveBeenCalledWith("Name is required.");
    expect(createAction).not.toHaveBeenCalled();
  });

  it("creates an item with a slugified name and closes on success", async () => {
    const { createAction } = renderManager();
    createAction.mockResolvedValue({ id: 3, name: "Sales Team", slug: "sales-team" });

    await userEvent.click(screen.getByRole("button", { name: "New tag" }));
    await userEvent.type(screen.getByLabelText("Name"), "Sales Team");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(createAction).toHaveBeenCalledWith({ name: "Sales Team", slug: "sales-team" });
    expect(toastSuccess).toHaveBeenCalledWith("Tag created.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("pre-fills the form and calls updateAction when editing", async () => {
    const { updateAction } = renderManager({
      items: [{ id: 5, name: "Draft", slug: "draft" }],
    });
    updateAction.mockResolvedValue({ id: 5, name: "Renamed", slug: "renamed" });

    await userEvent.click(screen.getByLabelText("Edit Draft"));
    expect(screen.getByLabelText("Name")).toHaveValue("Draft");

    await userEvent.clear(screen.getByLabelText("Name"));
    await userEvent.type(screen.getByLabelText("Name"), "Renamed");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateAction).toHaveBeenCalledWith(5, { name: "Renamed", slug: "renamed" });
    expect(toastSuccess).toHaveBeenCalledWith("Tag updated.");
  });

  it("deletes after confirmation", async () => {
    const { deleteAction } = renderManager({
      items: [{ id: 5, name: "Draft", slug: "draft" }],
    });
    deleteAction.mockResolvedValue(undefined);

    await userEvent.click(screen.getByLabelText("Delete Draft"));

    expect(deleteAction).toHaveBeenCalledWith(5);
    expect(toastSuccess).toHaveBeenCalledWith("Tag deleted.");
  });

  it("shows an error toast when create fails", async () => {
    const { createAction } = renderManager();
    createAction.mockRejectedValue(new Error("Name already taken."));

    await userEvent.click(screen.getByRole("button", { name: "New tag" }));
    await userEvent.type(screen.getByLabelText("Name"), "Draft");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(toastError).toHaveBeenCalledWith("Name already taken.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows an error toast when delete fails", async () => {
    const { deleteAction } = renderManager({
      items: [{ id: 5, name: "Draft", slug: "draft" }],
    });
    deleteAction.mockRejectedValue(new Error("In use, cannot delete."));

    await userEvent.click(screen.getByLabelText("Delete Draft"));

    expect(toastError).toHaveBeenCalledWith("In use, cannot delete.");
  });

  it("does not delete when confirmation is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { deleteAction } = renderManager({
      items: [{ id: 5, name: "Draft", slug: "draft" }],
    });

    await userEvent.click(screen.getByLabelText("Delete Draft"));

    expect(deleteAction).not.toHaveBeenCalled();
  });

  it("hides the color field when supportsColor is false", async () => {
    renderManager({ supportsColor: false });

    await userEvent.click(screen.getByRole("button", { name: "New tag" }));

    expect(screen.queryByLabelText(/Color/)).not.toBeInTheDocument();
  });

  it("shows the color field and includes it in the submitted body when supportsColor is true and set", async () => {
    const createAction = vi.fn().mockResolvedValue({ id: 1, name: "Cat", slug: "cat" });
    render(
      <TooltipProvider>
        <EntityManager<Item>
          title="Categories"
          singular="Category"
          items={[]}
          supportsColor
          createAction={createAction}
          updateAction={vi.fn()}
          deleteAction={vi.fn()}
        />
      </TooltipProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "New category" }));
    await userEvent.type(screen.getByLabelText("Name"), "Cat");
    await userEvent.type(screen.getByLabelText(/Color/), "#4f46e5");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(createAction).toHaveBeenCalledWith({ name: "Cat", slug: "cat", color: "#4f46e5" });
    expect(toastSuccess).toHaveBeenCalledWith("Category created.");
  });

  it("uses an explicit singular label instead of chopping a trailing 's' (Categories -> Category, not Categorie)", async () => {
    const createAction = vi.fn().mockResolvedValue({ id: 1, name: "Cat", slug: "cat" });
    render(
      <TooltipProvider>
        <EntityManager<Item>
          title="Categories"
          singular="Category"
          items={[]}
          createAction={createAction}
          updateAction={vi.fn()}
          deleteAction={vi.fn()}
        />
      </TooltipProvider>
    );

    expect(screen.getByRole("button", { name: "New category" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "New category" }));
    expect(screen.getByRole("heading", { name: "New category" })).toBeInTheDocument();
  });
});
