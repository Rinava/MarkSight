import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Tree-shake large barrel-file packages so only used modules are bundled.
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-tooltip",
    ],
  },
};

export default nextConfig;
