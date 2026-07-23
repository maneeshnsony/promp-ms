import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { EmptyState } from "@/components/empty-state";

describe("EmptyState", () => {
  it("shows a clear-filters link and message when filters are active", () => {
    render(<EmptyState hasActiveFilters />);

    expect(
      screen.getByText("No prompts match your current search or filters.")
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Clear filters" });
    expect(link).toHaveAttribute("href", "/");
  });

  it("shows a create-one message and no link when there are no active filters", () => {
    render(<EmptyState hasActiveFilters={false} />);

    expect(screen.getByText("No prompts yet — create one to get started.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
