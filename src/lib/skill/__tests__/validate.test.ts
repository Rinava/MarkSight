import { describe, it, expect } from "vitest";
import { validateSkill } from "../validate";

describe("validateSkill", () => {
  it("accepts a minimal valid skill", () => {
    const result = validateSkill({
      name: "my-skill",
      description: "Does a useful thing.",
    });
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("accepts all allowed optional keys", () => {
    const result = validateSkill({
      name: "my-skill",
      description: "Does a useful thing.",
      license: "MIT",
      "allowed-tools": "Read, Write",
      compatibility: "Requires Node 20",
      metadata: { author: "x" },
    });
    expect(result.valid).toBe(true);
  });

  it("requires name and description", () => {
    const result = validateSkill({});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing 'name' in frontmatter");
    expect(result.errors).toContain("Missing 'description' in frontmatter");
  });

  it("rejects unexpected frontmatter keys", () => {
    const result = validateSkill({
      name: "my-skill",
      description: "ok",
      title: "nope",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Unexpected key"))).toBe(true);
  });

  it("rejects blank or whitespace-only required fields", () => {
    const result = validateSkill({ name: "   ", description: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /name/i.test(e) && /empty/i.test(e))).toBe(true);
    expect(result.errors.some((e) => /description/i.test(e) && /empty/i.test(e))).toBe(true);
  });

  it("rejects non-kebab-case names", () => {
    expect(validateSkill({ name: "My_Skill", description: "x" }).valid).toBe(false);
    expect(validateSkill({ name: "My Skill", description: "x" }).valid).toBe(false);
  });

  it("rejects leading/trailing/consecutive hyphens in name", () => {
    expect(validateSkill({ name: "-skill", description: "x" }).valid).toBe(false);
    expect(validateSkill({ name: "skill-", description: "x" }).valid).toBe(false);
    expect(validateSkill({ name: "my--skill", description: "x" }).valid).toBe(false);
  });

  it("rejects names longer than 64 characters", () => {
    const result = validateSkill({ name: "a".repeat(65), description: "x" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("too long"))).toBe(true);
  });

  it("rejects angle brackets in description", () => {
    const result = validateSkill({
      name: "my-skill",
      description: "Renders <html> tags",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("angle brackets"))).toBe(true);
  });

  it("rejects descriptions longer than 1024 characters", () => {
    const result = validateSkill({
      name: "my-skill",
      description: "x".repeat(1025),
    });
    expect(result.valid).toBe(false);
  });

  it("rejects compatibility longer than 500 characters", () => {
    const result = validateSkill({
      name: "my-skill",
      description: "ok",
      compatibility: "x".repeat(501),
    });
    expect(result.valid).toBe(false);
  });

  it("rejects non-string name/description", () => {
    expect(validateSkill({ name: 123, description: "x" }).valid).toBe(false);
    expect(validateSkill({ name: "my-skill", description: 5 }).valid).toBe(false);
  });
});
