/**
 * Skill-shaped starter document: H1 becomes the skill name, the intro
 * paragraph is written as a trigger description (passes the quality hints by
 * construction), and the sections model instruction-shaped structure.
 */
export const SKILL_TEMPLATE = `# My New Skill

Use this skill when the user asks to do X. It performs Y and produces Z.

## When to use

- The user mentions X, or asks for Y
- A file of type Z needs processing

## Steps

1. Check the input for A.
2. Do B, then C.
3. Verify the result: D should hold.

## Output format

Describe exactly what the final answer should look like — a table, a file, a
short summary. Be specific enough that two runs produce the same shape.
`;
