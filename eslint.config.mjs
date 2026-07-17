import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// eslint-config-next 16 ships native flat configs, so they are spread directly
// (the FlatCompat shim previously used for the legacy `.eslintrc` presets is no
// longer needed).
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: ["node_modules/**", ".next/**", ".claude/**", "out/**", "build/**", "next-env.d.ts"],
  },
  {
    // eslint-config-next 16 bundles eslint-plugin-react-hooks v6, whose new
    // React-Compiler-era rules flag intentional SSR-hydration patterns (the
    // next-themes `mounted` flag, localStorage/media-query reads in effects) and
    // vendored shadcn/ui primitives we don't hand-edit. Surface them as warnings
    // rather than block the Next 16 upgrade; a dedicated cleanup is tracked in #52.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
];

export default eslintConfig;
