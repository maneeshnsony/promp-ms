import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { trackCopyAction } = vi.hoisted(() => ({
  trackCopyAction: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/actions", () => ({ trackCopyAction }));

Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

import { PromptDetailDialog } from "@/components/prompt-detail-dialog";
import type { Prompt } from "@/lib/types";

function makePrompt(overrides: Partial<Prompt> = {}): Prompt {
  return {
    id: 7,
    title: "Detailed prompt",
    description: "Full prompt body.",
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

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PromptDetailDialog", () => {
  it("renders the prompt title and description", () => {
    render(<PromptDetailDialog prompt={makePrompt()} open onOpenChange={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Detailed prompt" })).toBeInTheDocument();
    expect(screen.getByText("Full prompt body.")).toBeInTheDocument();
  });

  it("copies the full description to the clipboard and tracks the copy", async () => {
    render(<PromptDetailDialog prompt={makePrompt()} open onOpenChange={vi.fn()} />);

    await userEvent.click(screen.getByLabelText("Copy prompt to clipboard"));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Full prompt body.");
    expect(trackCopyAction).toHaveBeenCalledWith(7);
  });

  it('shows a transient "Copied" state that reverts after 1.5s', async () => {
    vi.useFakeTimers();
    render(<PromptDetailDialog prompt={makePrompt()} open onOpenChange={vi.fn()} />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Copy prompt to clipboard"));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText("Copied")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.queryByText("Copied")).not.toBeInTheDocument();
    expect(screen.getByText("Copy")).toBeInTheDocument();
  });
});
