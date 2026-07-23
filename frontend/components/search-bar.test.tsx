import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
let params = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => params,
}));

import { SearchBar } from "@/components/search-bar";

describe("SearchBar", () => {
  beforeEach(() => {
    push.mockClear();
    params = new URLSearchParams();
  });

  it("reads its initial value from the URL", () => {
    params = new URLSearchParams("search=release");
    render(<SearchBar />);
    expect(screen.getByRole("textbox")).toHaveValue("release");
  });

  it("debounces before writing to the URL and resets page to 1", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);

    await user.type(screen.getByRole("textbox"), "hello");
    expect(push).not.toHaveBeenCalled();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/?search=hello&page=1"), { timeout: 1000 });
  });

  it("removes the search param when cleared", async () => {
    params = new URLSearchParams("search=hello");
    const user = userEvent.setup();
    render(<SearchBar />);

    await user.clear(screen.getByRole("textbox"));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/?page=1"), { timeout: 1000 });
  });

  it("syncs its value when the URL search param changes externally (e.g. back/forward navigation)", () => {
    params = new URLSearchParams("search=first");
    const { rerender } = render(<SearchBar />);
    expect(screen.getByRole("textbox")).toHaveValue("first");

    params = new URLSearchParams("search=second");
    rerender(<SearchBar />);

    expect(screen.getByRole("textbox")).toHaveValue("second");
  });
});
