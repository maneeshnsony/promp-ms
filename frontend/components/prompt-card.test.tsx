import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { TooltipProvider } from "@/components/ui/tooltip";

const { trackCopyAction, getPromptVersions, deletePromptAction } = vi.hoisted(() => ({
  trackCopyAction: vi.fn().mockResolvedValue(undefined),
  getPromptVersions: vi.fn().mockResolvedValue([]),
  deletePromptAction: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/actions", () => ({
  trackCopyAction,
  deletePromptAction,
  createPromptAction: vi.fn(),
  updatePromptAction: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ getPromptVersions }));

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

  it("does not delete when the confirmation is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const prompt = makePrompt();
    renderCard(prompt);

    await userEvent.click(screen.getByLabelText("Delete prompt"));

    expect(deletePromptAction).not.toHaveBeenCalled();
  });
});
