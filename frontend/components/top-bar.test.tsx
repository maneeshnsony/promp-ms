import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname }));

import { TopBar } from "@/components/top-bar";

describe("TopBar", () => {
  it("renders nothing on the login page", () => {
    usePathname.mockReturnValue("/login");
    const { container } = render(<TopBar />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the nav links elsewhere", () => {
    usePathname.mockReturnValue("/");
    render(<TopBar />);

    expect(screen.getByRole("link", { name: "Prompts" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Categories" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tags" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Roles" })).toBeInTheDocument();
  });

  it("marks the link matching the current pathname as active", () => {
    usePathname.mockReturnValue("/categories");
    render(<TopBar />);

    expect(screen.getByRole("link", { name: "Categories" }).className).toContain("font-medium");
    expect(screen.getByRole("link", { name: "Tags" }).className).toContain("text-muted-foreground");
  });
});
