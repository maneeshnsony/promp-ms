import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
let params = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => params,
}));

import { FilterSidebar } from "@/components/filter-sidebar";

const categories = [
  { id: 1, name: "Coding", slug: "coding", icon: null, color: null },
  { id: 2, name: "Writing", slug: "writing", icon: null, color: null },
];
const tags = [{ id: 5, name: "quick", slug: "quick" }];
const roles = [{ id: 9, name: "Reviewer", slug: "reviewer" }];

describe("FilterSidebar", () => {
  beforeEach(() => {
    push.mockClear();
    params = new URLSearchParams();
  });

  it("writes the category param independently and resets page", async () => {
    render(<FilterSidebar categories={categories} tags={tags} roles={roles} />);
    await userEvent.click(screen.getByText("Coding"));
    expect(push).toHaveBeenCalledWith("/?category=1&page=1");
  });

  it("toggles a facet off when clicked again", async () => {
    params = new URLSearchParams("category=1");
    render(<FilterSidebar categories={categories} tags={tags} roles={roles} />);
    await userEvent.click(screen.getByText("Coding"));
    expect(push).toHaveBeenCalledWith("/?page=1");
  });

  it("only shows Clear all filters when a filter is active", () => {
    const { rerender } = render(<FilterSidebar categories={categories} tags={tags} roles={roles} />);
    expect(screen.queryByText("Clear all filters")).not.toBeInTheDocument();

    params = new URLSearchParams("tag=5");
    rerender(<FilterSidebar categories={categories} tags={tags} roles={roles} />);
    expect(screen.getByText("Clear all filters")).toBeInTheDocument();
  });
});
