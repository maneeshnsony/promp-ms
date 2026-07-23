import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SlotFillDialog } from "@/components/slot-fill-dialog";

describe("SlotFillDialog", () => {
  it("renders a labeled input per slot and a live preview", () => {
    render(
      <SlotFillDialog
        open
        onOpenChange={vi.fn()}
        description="Write a {tone} summary for {audience}."
        slots={["tone", "audience"]}
        onCopy={vi.fn()}
      />
    );

    expect(screen.getByLabelText("tone")).toBeInTheDocument();
    expect(screen.getByLabelText("audience")).toBeInTheDocument();
    expect(screen.getByText("Write a {tone} summary for {audience}.")).toBeInTheDocument();
  });

  it("updates the preview live as the user types", async () => {
    render(
      <SlotFillDialog
        open
        onOpenChange={vi.fn()}
        description="Hello {name}."
        slots={["name"]}
        onCopy={vi.fn()}
      />
    );

    await userEvent.type(screen.getByLabelText("name"), "World");

    expect(screen.getByText("Hello World.")).toBeInTheDocument();
  });

  it("disables Copy until every slot has a non-whitespace value", async () => {
    render(
      <SlotFillDialog
        open
        onOpenChange={vi.fn()}
        description="{a} and {b}"
        slots={["a", "b"]}
        onCopy={vi.fn()}
      />
    );

    const copyButton = screen.getByRole("button", { name: "Copy" });
    expect(copyButton).toBeDisabled();

    await userEvent.type(screen.getByLabelText("a"), "  ");
    expect(copyButton).toBeDisabled();

    await userEvent.type(screen.getByLabelText("b"), "x");
    expect(copyButton).toBeDisabled();

    await userEvent.clear(screen.getByLabelText("a"));
    await userEvent.type(screen.getByLabelText("a"), "y");
    expect(copyButton).toBeEnabled();
  });

  it("calls onCopy with the filled-in text", async () => {
    const onCopy = vi.fn();
    render(
      <SlotFillDialog
        open
        onOpenChange={vi.fn()}
        description="Hello {name}."
        slots={["name"]}
        onCopy={onCopy}
      />
    );

    await userEvent.type(screen.getByLabelText("name"), "World");
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(onCopy).toHaveBeenCalledWith("Hello World.");
  });

  // Note: handleOpenChange's `if (next) setValues({})` reset branch is only reachable via
  // Radix calling onOpenChange(true), which requires a DialogTrigger inside this component.
  // SlotFillDialog has none (it's opened imperatively by PromptCard), so that branch is
  // unreachable through the component's actual usage and isn't exercised here.
});
