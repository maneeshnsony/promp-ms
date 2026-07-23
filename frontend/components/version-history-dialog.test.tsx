import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";

const { getPromptVersions } = vi.hoisted(() => ({ getPromptVersions: vi.fn() }));
vi.mock("@/lib/api", () => ({ getPromptVersions }));

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

import { VersionHistoryDialog } from "@/components/version-history-dialog";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("VersionHistoryDialog", () => {
  it("never fetches while closed", () => {
    render(<VersionHistoryDialog promptId={1} open={false} onOpenChange={vi.fn()} />);

    expect(getPromptVersions).not.toHaveBeenCalled();
  });

  it("shows a loading skeleton, then the version list once resolved", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-23T12:00:00Z"));
    let resolveFn!: (value: unknown) => void;
    getPromptVersions.mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      })
    );

    render(<VersionHistoryDialog promptId={1} open onOpenChange={vi.fn()} />);

    expect(document.body.querySelectorAll(".animate-pulse")).toHaveLength(3);

    await act(async () => {
      resolveFn([
        { id: 1, title: "Old title", description: "Old description", edited_at: "2026-07-23T11:50:00Z" },
      ]);
    });

    expect(screen.getByText("Old title")).toBeInTheDocument();
    expect(screen.getByText("Old description")).toBeInTheDocument();
    expect(screen.getByText("10 minutes ago")).toBeInTheDocument();
  });

  it("formats hour- and day-scale timestamps", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-23T12:00:00Z"));
    getPromptVersions.mockResolvedValue([
      { id: 1, title: "Hours old", description: "D1", edited_at: "2026-07-23T09:00:00Z" },
      { id: 2, title: "Days old", description: "D2", edited_at: "2026-07-21T12:00:00Z" },
    ]);

    await act(async () => {
      render(<VersionHistoryDialog promptId={1} open onOpenChange={vi.fn()} />);
    });

    expect(screen.getByText("3 hours ago")).toBeInTheDocument();
    expect(screen.getByText("2 days ago")).toBeInTheDocument();
  });

  it('shows "No edits yet." for an empty version list', async () => {
    getPromptVersions.mockResolvedValue([]);

    render(<VersionHistoryDialog promptId={1} open onOpenChange={vi.fn()} />);

    expect(await screen.findByText("No edits yet.")).toBeInTheDocument();
  });

  it("shows an error message and a toast when the fetch fails", async () => {
    getPromptVersions.mockRejectedValue(new Error("network error"));

    render(<VersionHistoryDialog promptId={1} open onOpenChange={vi.fn()} />);

    expect(await screen.findByText("Couldn't load version history.")).toBeInTheDocument();
    expect(toastError).toHaveBeenCalledWith("Failed to load version history.");
  });

  it("re-fetches when reopened", async () => {
    getPromptVersions.mockResolvedValue([]);
    const { rerender } = render(
      <VersionHistoryDialog promptId={1} open onOpenChange={vi.fn()} />
    );
    await screen.findByText("No edits yet.");

    rerender(<VersionHistoryDialog promptId={1} open={false} onOpenChange={vi.fn()} />);
    rerender(<VersionHistoryDialog promptId={1} open onOpenChange={vi.fn()} />);

    await waitFor(() => expect(getPromptVersions).toHaveBeenCalledTimes(2));
  });

  it("ignores a stale response that resolves after the promptId has changed", async () => {
    let resolveFirst!: (value: unknown) => void;
    getPromptVersions.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        })
    );
    getPromptVersions.mockImplementationOnce(() =>
      Promise.resolve([
        { id: 2, title: "Second prompt version", description: "D2", edited_at: "2026-07-23T00:00:00Z" },
      ])
    );

    const { rerender } = render(
      <VersionHistoryDialog promptId={1} open onOpenChange={vi.fn()} />
    );

    rerender(<VersionHistoryDialog promptId={2} open onOpenChange={vi.fn()} />);

    expect(await screen.findByText("Second prompt version")).toBeInTheDocument();

    resolveFirst([
      { id: 1, title: "Stale first prompt version", description: "D1", edited_at: "2026-07-23T00:00:00Z" },
    ]);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.queryByText("Stale first prompt version")).not.toBeInTheDocument();
    expect(screen.getByText("Second prompt version")).toBeInTheDocument();
  });
});
