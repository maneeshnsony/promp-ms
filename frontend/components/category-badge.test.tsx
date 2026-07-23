import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { CategoryBadge } from "@/components/category-badge";
import type { Category } from "@/lib/types";

function makeCategory(overrides: Partial<Category> = {}): Category {
  return { id: 1, name: "Marketing", slug: "marketing", icon: null, color: null, ...overrides };
}

describe("CategoryBadge", () => {
  it("renders the category name", () => {
    render(<CategoryBadge category={makeCategory()} />);

    expect(screen.getByText("Marketing")).toBeInTheDocument();
  });

  it("renders an icon when category.icon matches a known key (case-insensitive)", () => {
    const { container } = render(<CategoryBadge category={makeCategory({ icon: "Rocket" })} />);

    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders no icon when category.icon does not match a known key", () => {
    const { container } = render(<CategoryBadge category={makeCategory({ icon: "nonexistent" })} />);

    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders no icon when category.icon is null", () => {
    const { container } = render(<CategoryBadge category={makeCategory({ icon: null })} />);

    expect(container.querySelector("svg")).toBeNull();
  });

  it("uses inline background/color styles when category.color is set", () => {
    render(<CategoryBadge category={makeCategory({ color: "#4f46e5" })} />);

    const badge = screen.getByText("Marketing").closest('[data-slot="category-badge"]');
    expect(badge).toHaveStyle({ color: "#4f46e5" });
  });

  it("falls back to a deterministic palette class when there is no explicit color", () => {
    render(<CategoryBadge category={makeCategory({ id: 3, color: null })} />);

    const badge = screen.getByText("Marketing").closest('[data-slot="category-badge"]');
    expect(badge).not.toHaveAttribute("style");
    expect(badge?.className).toMatch(/bg-\w+-500\/15/);
  });
});
