import { describe, expect, it } from "vitest";
import { extractSlots, fillSlots } from "@/lib/slots";

describe("extractSlots", () => {
  it("returns an empty array when there are no slots", () => {
    expect(extractSlots("Plain text with no tokens.")).toEqual([]);
  });

  it("returns multiple distinct slots in first-seen order", () => {
    expect(extractSlots("Write a {tone} summary for {audience}.")).toEqual(["tone", "audience"]);
  });

  it("dedupes a repeated slot, keeping its first-seen position", () => {
    expect(extractSlots("{tone} then {audience} then {tone} again.")).toEqual([
      "tone",
      "audience",
    ]);
  });

  it("does not match braces containing non-word characters", () => {
    expect(extractSlots("This {is not a slot} but {this_is}.")).toEqual(["this_is"]);
  });

  it("matches adjacent, back-to-back slots", () => {
    expect(extractSlots("{a}{b}")).toEqual(["a", "b"]);
  });
});

describe("fillSlots", () => {
  it("replaces matched tokens with the provided values", () => {
    expect(fillSlots("Write a {tone} summary for {audience}.", { tone: "formal", audience: "execs" })).toBe(
      "Write a formal summary for execs."
    );
  });

  it("leaves a token unreplaced when no value is provided for it", () => {
    expect(fillSlots("Write a {tone} summary for {audience}.", { tone: "formal" })).toBe(
      "Write a formal summary for {audience}."
    );
  });

  it("returns the description unchanged when there are no slots", () => {
    expect(fillSlots("No tokens here.", {})).toBe("No tokens here.");
  });
});
