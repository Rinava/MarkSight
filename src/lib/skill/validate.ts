import { ALLOWED_FRONTMATTER_KEYS, type ValidationResult } from "./types";

/**
 * Validate a skill's frontmatter against the Agent Skill spec.
 *
 * This is a faithful TypeScript port of the official skill-creator
 * `scripts/quick_validate.py`, so anything that passes here also passes the
 * canonical Python validator. It operates on a frontmatter record keyed by the
 * on-disk YAML names (`name`, `description`, `allowed-tools`, …).
 */

const ALLOWED = new Set<string>(ALLOWED_FRONTMATTER_KEYS);
const NAME_PATTERN = /^[a-z0-9-]+$/;
const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;
const MAX_COMPATIBILITY_LENGTH = 500;

export function validateSkill(
  frontmatter: Record<string, unknown>,
): ValidationResult {
  const errors: string[] = [];

  if (
    frontmatter === null ||
    typeof frontmatter !== "object" ||
    Array.isArray(frontmatter)
  ) {
    return { valid: false, errors: ["Frontmatter must be a YAML dictionary"] };
  }

  // Unexpected keys
  const unexpected = Object.keys(frontmatter).filter((key) => !ALLOWED.has(key));
  if (unexpected.length > 0) {
    errors.push(
      `Unexpected key(s) in SKILL.md frontmatter: ${unexpected
        .sort()
        .join(", ")}. Allowed properties are: ${[...ALLOWED]
        .sort()
        .join(", ")}`,
    );
  }

  // Required fields
  if (!("name" in frontmatter)) errors.push("Missing 'name' in frontmatter");
  if (!("description" in frontmatter)) {
    errors.push("Missing 'description' in frontmatter");
  }

  // name
  const name = frontmatter.name;
  if (name !== undefined) {
    if (typeof name !== "string") {
      errors.push(`Name must be a string, got ${typeof name}`);
    } else {
      const trimmed = name.trim();
      if (!trimmed) {
        errors.push("Name cannot be empty");
      } else {
        if (!NAME_PATTERN.test(trimmed)) {
          errors.push(
            `Name '${trimmed}' should be kebab-case (lowercase letters, digits, and hyphens only)`,
          );
        }
        if (
          trimmed.startsWith("-") ||
          trimmed.endsWith("-") ||
          trimmed.includes("--")
        ) {
          errors.push(
            `Name '${trimmed}' cannot start/end with hyphen or contain consecutive hyphens`,
          );
        }
        if (trimmed.length > MAX_NAME_LENGTH) {
          errors.push(
            `Name is too long (${trimmed.length} characters). Maximum is ${MAX_NAME_LENGTH} characters.`,
          );
        }
      }
    }
  }

  // description
  const description = frontmatter.description;
  if (description !== undefined) {
    if (typeof description !== "string") {
      errors.push(`Description must be a string, got ${typeof description}`);
    } else {
      const trimmed = description.trim();
      if (!trimmed) {
        errors.push("Description cannot be empty");
      } else {
        if (trimmed.includes("<") || trimmed.includes(">")) {
          errors.push("Description cannot contain angle brackets (< or >)");
        }
        if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
          errors.push(
            `Description is too long (${trimmed.length} characters). Maximum is ${MAX_DESCRIPTION_LENGTH} characters.`,
          );
        }
      }
    }
  }

  // compatibility (optional)
  const compatibility = frontmatter.compatibility;
  if (compatibility) {
    if (typeof compatibility !== "string") {
      errors.push(`Compatibility must be a string, got ${typeof compatibility}`);
    } else if (compatibility.length > MAX_COMPATIBILITY_LENGTH) {
      errors.push(
        `Compatibility is too long (${compatibility.length} characters). Maximum is ${MAX_COMPATIBILITY_LENGTH} characters.`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}
