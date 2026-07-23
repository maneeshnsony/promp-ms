import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { getPrompts } = vi.hoisted(() => ({ getPrompts: vi.fn() }));
vi.mock("@/lib/api", () => ({ getPrompts }));

vi.mock("@/components/prompt-card", () => ({
  PromptCard: ({ prompt }: { prompt: { id: number; title: string } }) => (
    <div data-testid="card">{prompt.title}</div>
  ),
}));

import { PinnedRow } from "@/components/pinned-row";

beforeEach(() => {
  vi.clearAllMocks();
});

// PinnedRow is an async Server Component — React Testing Library can't render it as
// <PinnedRow /> directly (nothing awaits the returned promise), so call it directly and
// await the result, then render the resolved element.
describe("PinnedRow", () => {
  it("returns null when there are no pinned prompts", async () => {
    getPrompts.mockResolvedValue({ data: [], meta: { page: 1, per_page: 10, total: 0 } });

    const element = await PinnedRow({ categories: [], tags: [], roles: [] });

    expect(element).toBeNull();
  });

  it("renders a PromptCard per pinned prompt and requests pinned=true, per_page=10", async () => {
    getPrompts.mockResolvedValue({
      data: [
        { id: 1, title: "First pinned" },
        { id: 2, title: "Second pinned" },
      ],
      meta: { page: 1, per_page: 10, total: 2 },
    });

    const element = await PinnedRow({ categories: [], tags: [], roles: [] });
    render(element);

    expect(getPrompts).toHaveBeenCalledWith({ pinned: true, per_page: 10 });
    expect(screen.getByText("First pinned")).toBeInTheDocument();
    expect(screen.getByText("Second pinned")).toBeInTheDocument();
  });
});
