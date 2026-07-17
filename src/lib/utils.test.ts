import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges conflicting Tailwind classes with the later class winning", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("drops falsy values from conditional classes", () => {
    expect(cn("a", false && "b", "c", null, undefined)).toBe("a c");
  });

  it("flattens array and object class inputs", () => {
    expect(cn(["text-sm", ["font-medium"]], { hidden: false, block: true })).toBe(
      "text-sm font-medium block"
    );
  });
});
