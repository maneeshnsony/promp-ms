import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { TagChip } from "@/components/tag-chip";

describe("TagChip", () => {
  it("renders the tag name", () => {
    render(<TagChip tag={{ id: 1, name: "Draft", slug: "draft" }} />);

    expect(screen.getByText("Draft")).toBeInTheDocument();
  });
});
