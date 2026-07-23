import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { TooltipProvider } from "@/components/ui/tooltip";

const { trackCopyAction, getPromptVersions, deletePromptAction, createPromptAction } = vi.hoisted(
  () => ({
    trackCopyAction: vi.fn().mockResolvedValue(undefined),
    getPromptVersions: vi.fn().mockResolvedValue([]),
    deletePromptAction: vi.fn().mockResolvedValue(undefined),
    createPromptAction: vi.fn(),
  })
);
vi.mock("@/lib/actions", () => ({
  trackCopyAction,
  deletePromptAction,
  createPromptAction,
  updatePromptAction: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ getPromptVersions }));

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastError } }));

Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

import { PromptCard } from "@/components/prompt-card";
import type { Prompt } from "@/lib/types";

function makePrompt(overrides: Partial<Prompt> = {}): Prompt {
  return {
    id: 1,
    title: "Test prompt",
    description: "Write a {tone} summary for {audience}.",
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

describe("PromptCard", () => {
  beforeEach(() => {
    trackCopyAction.mockClear();
    deletePromptAction.mockClear();
    createPromptAction.mockClear();
    toastSuccess.mockClear();
    toastError.mockClear();
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockClear();
  });

  function renderCard(prompt: Prompt) {
    return render(
      <TooltipProvider>
        <PromptCard prompt={prompt} categories={[]} tags={[]} roles={[]} />
      </TooltipProvider>
    );
  }

  it("copies directly and tracks the copy when there are no slots", async () => {
    const prompt = makePrompt({ description: "Plain prompt with no tokens." });
    renderCard(prompt);

    await userEvent.click(screen.getByLabelText("Copy prompt to clipboard"));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Plain prompt with no tokens.");
    expect(trackCopyAction).toHaveBeenCalledWith(1);
  });

  it("opens the slot fill dialog instead of copying directly when the description has {slots}", async () => {
    const prompt = makePrompt();
    renderCard(prompt);

    await userEvent.click(screen.getByLabelText("Copy prompt to clipboard"));

    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(screen.getByText("Fill in placeholders")).toBeInTheDocument();
    expect(screen.getByLabelText("tone")).toBeInTheDocument();
    expect(screen.getByLabelText("audience")).toBeInTheDocument();
  });

  it("disables Copy in the slot dialog until every slot is filled", async () => {
    const prompt = makePrompt();
    renderCard(prompt);
    await userEvent.click(screen.getByLabelText("Copy prompt to clipboard"));

    const copyButton = screen.getByRole("button", { name: "Copy" });
    expect(copyButton).toBeDisabled();

    await userEvent.type(screen.getByLabelText("tone"), "formal");
    expect(copyButton).toBeDisabled();

    await userEvent.type(screen.getByLabelText("audience"), "execs");
    expect(copyButton).toBeEnabled();

    await userEvent.click(copyButton);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Write a formal summary for execs.");
    expect(trackCopyAction).toHaveBeenCalledWith(1);
  });

  it("deletes the prompt after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const prompt = makePrompt();
    renderCard(prompt);

    await userEvent.click(screen.getByLabelText("Delete prompt"));

    expect(deletePromptAction).toHaveBeenCalledWith(1);
  });

  it("shows an error toast and re-enables delete when deletion fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    deletePromptAction.mockRejectedValueOnce(new Error("In use."));
    const prompt = makePrompt();
    renderCard(prompt);

    await userEvent.click(screen.getByLabelText("Delete prompt"));

    expect(toastError).toHaveBeenCalledWith("In use.");
    expect(screen.getByLabelText("Delete prompt")).toBeEnabled();
  });

  it("does not delete when the confirmation is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const prompt = makePrompt();
    renderCard(prompt);

    await userEvent.click(screen.getByLabelText("Delete prompt"));

    expect(deletePromptAction).not.toHaveBeenCalled();
  });

  it("renders the pin badge only when the prompt is pinned", () => {
    const { rerender } = renderCard(makePrompt({ is_pinned: true }));
    expect(screen.getByLabelText("Pinned — start here")).toBeInTheDocument();

    rerender(
      <TooltipProvider>
        <PromptCard prompt={makePrompt({ is_pinned: false })} categories={[]} tags={[]} roles={[]} />
      </TooltipProvider>
    );
    expect(screen.queryByLabelText("Pinned — start here")).not.toBeInTheDocument();
  });

  it("clones the prompt with a prefixed title and its existing facet ids", async () => {
    createPromptAction.mockResolvedValue({ id: 2 });
    const prompt = makePrompt({
      categories: [{ id: 1, name: "Marketing", slug: "marketing", icon: null, color: null }],
      tags: [{ id: 10, name: "Draft", slug: "draft" }],
      roles: [{ id: 20, name: "Writer", slug: "writer" }],
    });
    renderCard(prompt);

    await userEvent.click(screen.getByLabelText("Clone prompt"));

    expect(createPromptAction).toHaveBeenCalledWith({
      title: "CLONE ~ Test prompt",
      description: prompt.description,
      notes: undefined,
      category_ids: [1],
      tag_ids: [10],
      role_ids: [20],
    });
    expect(toastSuccess).toHaveBeenCalledWith("Prompt cloned.");
  });

  it("shows an error toast when cloning fails", async () => {
    createPromptAction.mockRejectedValue(new Error("Clone failed."));
    renderCard(makePrompt());

    await userEvent.click(screen.getByLabelText("Clone prompt"));

    expect(toastError).toHaveBeenCalledWith("Clone failed.");
  });

  it("opens the edit dialog from the edit trigger", async () => {
    renderCard(makePrompt());

    await userEvent.click(screen.getByLabelText("Edit prompt"));

    expect(screen.getByRole("heading", { name: "Edit prompt" })).toBeInTheDocument();
  });

  it("opens the detail dialog from the see-more trigger", async () => {
    renderCard(makePrompt({ title: "Detail me" }));

    await userEvent.click(screen.getByLabelText("Show full prompt"));

    expect(screen.getByRole("heading", { name: "Detail me" })).toBeInTheDocument();
  });

  it("opens the version history dialog from its trigger", async () => {
    renderCard(makePrompt());

    await userEvent.click(screen.getByLabelText("View version history"));

    expect(screen.getByRole("heading", { name: "Version history" })).toBeInTheDocument();
    expect(getPromptVersions).toHaveBeenCalledWith(1);
  });

  it("renders category and tag badges in the footer when present", () => {
    renderCard(
      makePrompt({
        categories: [{ id: 1, name: "Marketing", slug: "marketing", icon: null, color: null }],
        tags: [{ id: 10, name: "Draft", slug: "draft" }],
      })
    );

    expect(screen.getByText("Marketing")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("renders no footer when there are no categories or tags", () => {
    renderCard(makePrompt({ categories: [], tags: [] }));

    expect(screen.queryByText("Marketing")).not.toBeInTheDocument();
  });

  it("shows a notes toggle only when notes are present, and reveals them on click", async () => {
    const { rerender } = renderCard(makePrompt({ notes: null }));
    expect(screen.queryByText("Why this works")).not.toBeInTheDocument();

    rerender(
      <TooltipProvider>
        <PromptCard
          prompt={makePrompt({ notes: "Because it works." })}
          categories={[]}
          tags={[]}
          roles={[]}
        />
      </TooltipProvider>
    );

    const toggle = screen.getByText("Why this works");
    expect(screen.queryByText("Because it works.")).not.toBeInTheDocument();

    await userEvent.click(toggle);

    expect(screen.getByText("Because it works.")).toBeInTheDocument();
    expect(screen.getByText("Hide notes")).toBeInTheDocument();
  });
});
