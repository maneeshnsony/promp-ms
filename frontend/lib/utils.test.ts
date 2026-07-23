import { describe, expect, it } from "vitest";
import { cn, slugify } from "@/lib/utils";

describe("cn", () => {
  it("merges class lists, resolving Tailwind conflicts in favor of the later class", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("drops falsy/conditional entries", () => {
    expect(cn("a", false && "b", undefined, null, "c")).toBe("a c");
  });
});

describe("slugify", () => {
  it.each([
    ["My Cat!", "my-cat"],
    ["  spaced  ", "spaced"],
    ["Already-slugged", "already-slugged"],
    ["---", ""],
    ["Sales Team", "sales-team"],
  ])("slugify(%j) => %j", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});
