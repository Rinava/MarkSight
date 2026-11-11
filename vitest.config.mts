import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Two projects, picked by file extension:
//   *.test.ts   run in plain Node (pure logic in src/lib and friends)
//   *.test.tsx  run in jsdom (hooks and components, with Testing Library)
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
        },
      },
    ],
  },
});
