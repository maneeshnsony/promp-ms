import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams("page=2"),
}));

import { Pagination } from "@/components/pagination";

describe("Pagination", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("renders nothing when there are no results", () => {
    const { container } = render(<Pagination page={1} perPage={20} total={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("disables Previous on the first page and Next on the last page", () => {
    render(<Pagination page={1} perPage={20} total={10} />);
    expect(screen.getByText("Previous")).toBeDisabled();
    expect(screen.getByText("Next")).toBeDisabled();
  });

  it("navigates to the next page, preserving other query params", async () => {
    render(<Pagination page={2} perPage={20} total={100} />);
    await userEvent.click(screen.getByText("Next"));
    expect(push).toHaveBeenCalledWith("/?page=3");
  });

  it("navigates to the previous page", async () => {
    render(<Pagination page={2} perPage={20} total={100} />);
    await userEvent.click(screen.getByText("Previous"));
    expect(push).toHaveBeenCalledWith("/?page=1");
  });
});
