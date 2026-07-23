import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/components/prompt-card", () => ({
  PromptCard: ({ prompt }: { prompt: { id: number; title: string } }) => (
    <div data-testid="card">{prompt.title}</div>
  ),
}));

import { TooltipProvider } from "@/components/ui/tooltip";
import { PromptGrid } from "@/components/prompt-grid";
import type { Prompt } from "@/lib/types";

const STORAGE_KEY = "prompt-grid-columns";

function makePrompt(id: number): Prompt {
  return {
    id,
    title: `Prompt ${id}`,
    description: "D",
    notes: null,
    is_pinned: false,
    copy_count: 0,
    categories: [],
    tags: [],
    roles: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function renderGrid(prompts: Prompt[] = [makePrompt(1)]) {
  return render(
    <TooltipProvider>
      <PromptGrid prompts={prompts} categories={[]} tags={[]} roles={[]} />
    </TooltipProvider>
  );
}

function gridStyle() {
  return screen.getByTestId("card").parentElement as HTMLElement;
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("PromptGrid", () => {
  it("defaults to 1 column when nothing is stored", () => {
    renderGrid();

    expect(gridStyle()).toHaveStyle({ gridTemplateColumns: "repeat(1, minmax(0, 1fr))" });
  });

  it("syncs to a valid stored column count after mount", () => {
    window.localStorage.setItem(STORAGE_KEY, "3");
    renderGrid();

    expect(gridStyle()).toHaveStyle({ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" });
    expect(screen.getByLabelText("Show 3 columns")).toHaveAttribute("aria-pressed", "true");
  });

  it("ignores an out-of-range stored value and stays at the default", () => {
    window.localStorage.setItem(STORAGE_KEY, "5");
    renderGrid();

    expect(gridStyle()).toHaveStyle({ gridTemplateColumns: "repeat(1, minmax(0, 1fr))" });
  });

  it("ignores a non-numeric stored value and stays at the default", () => {
    window.localStorage.setItem(STORAGE_KEY, "abc");
    renderGrid();

    expect(gridStyle()).toHaveStyle({ gridTemplateColumns: "repeat(1, minmax(0, 1fr))" });
  });

  it("updates the grid and persists to localStorage when a column button is clicked", async () => {
    renderGrid();

    await userEvent.click(screen.getByLabelText("Show 2 columns"));

    expect(gridStyle()).toHaveStyle({ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" });
    expect(screen.getByLabelText("Show 2 columns")).toHaveAttribute("aria-pressed", "true");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("2");
  });
});
