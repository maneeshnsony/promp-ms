import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

import { MultiSelect } from "@/components/multi-select";

const options = [
  { id: 1, name: "Marketing" },
  { id: 2, name: "Engineering" },
];

describe("MultiSelect", () => {
  beforeEach(() => {
    toastError.mockClear();
  });

  it("renders selected options as badges", () => {
    render(
      <MultiSelect label="Categories" options={options} selected={[1]} onChange={vi.fn()} />
    );

    expect(screen.getByText("Marketing")).toBeInTheDocument();
    expect(screen.getByLabelText("Remove Marketing")).toBeInTheDocument();
    expect(screen.queryByLabelText("Remove Engineering")).not.toBeInTheDocument();
  });

  it("removes a selected option when its badge remove button is clicked", async () => {
    const onChange = vi.fn();
    render(
      <MultiSelect label="Categories" options={options} selected={[1, 2]} onChange={onChange} />
    );

    await userEvent.click(screen.getByLabelText("Remove Marketing"));

    expect(onChange).toHaveBeenCalledWith([2]);
  });

  it("hides the option list until the search box is focused", async () => {
    render(<MultiSelect label="Categories" options={options} selected={[]} onChange={vi.fn()} />);

    expect(screen.queryByText("Engineering")).not.toBeInTheDocument();

    await userEvent.click(screen.getByPlaceholderText("Search categories..."));

    expect(screen.getByText("Engineering")).toBeInTheDocument();
  });

  it("toggles an option on when clicked from the list", async () => {
    const onChange = vi.fn();
    render(
      <MultiSelect label="Categories" options={options} selected={[]} onChange={onChange} />
    );

    await userEvent.click(screen.getByPlaceholderText("Search categories..."));
    await userEvent.click(screen.getByText("Engineering"));

    expect(onChange).toHaveBeenCalledWith([2]);
  });

  it("does not offer to create when onCreate is not provided", async () => {
    render(<MultiSelect label="Categories" options={options} selected={[]} onChange={vi.fn()} />);

    await userEvent.type(screen.getByPlaceholderText("Search categories..."), "Sales");

    expect(screen.queryByText(/Create/)).not.toBeInTheDocument();
  });

  it("does not offer to create when the query exactly matches an existing option", async () => {
    render(
      <MultiSelect
        label="Categories"
        options={options}
        selected={[]}
        onChange={vi.fn()}
        onCreate={vi.fn()}
      />
    );

    await userEvent.type(screen.getByPlaceholderText("Search categories..."), "marketing");

    expect(screen.queryByText(/Create/)).not.toBeInTheDocument();
  });

  it("offers to create a new option for an unmatched, non-empty query", async () => {
    render(
      <MultiSelect
        label="Categories"
        options={options}
        selected={[]}
        onChange={vi.fn()}
        onCreate={vi.fn()}
      />
    );

    await userEvent.type(screen.getByPlaceholderText("Search categories..."), "Sales");

    expect(screen.getByText('Create "Sales"')).toBeInTheDocument();
  });

  it("creates a new option, selects it, and clears the query on success", async () => {
    const onChange = vi.fn();
    const onCreate = vi.fn().mockResolvedValue({ id: 3, name: "Sales" });
    render(
      <MultiSelect
        label="Categories"
        options={options}
        selected={[1]}
        onChange={onChange}
        onCreate={onCreate}
      />
    );

    await userEvent.type(screen.getByPlaceholderText("Search categories..."), "Sales");
    await userEvent.click(screen.getByText('Create "Sales"'));

    expect(onCreate).toHaveBeenCalledWith("Sales");
    expect(onChange).toHaveBeenCalledWith([1, 3]);
    expect(screen.getByPlaceholderText("Search categories...")).toHaveValue("");
  });

  it("shows a toast error when onCreate rejects", async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error("Name already taken."));
    render(
      <MultiSelect
        label="Categories"
        options={options}
        selected={[]}
        onChange={vi.fn()}
        onCreate={onCreate}
      />
    );

    await userEvent.type(screen.getByPlaceholderText("Search categories..."), "Sales");
    await userEvent.click(screen.getByText('Create "Sales"'));

    expect(toastError).toHaveBeenCalledWith("Name already taken.");
  });

  it("renders the label inline beside the search box when inline is set", () => {
    const { container } = render(
      <MultiSelect inline label="Roles" options={options} selected={[]} onChange={vi.fn()} />
    );

    const label = screen.getByText("Roles");
    expect(label.parentElement?.className).toContain("items-center");
    expect(container.querySelector(".w-20")).toBe(label);
  });
});
