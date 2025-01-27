import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// e.g. /SpielZettel
const CUSTOM_ASSET_PREFIX = process.env.CUSTOM_ASSET_PREFIX ?? "";

const nextConfig: NextConfig = {
  // Configuration for a static export (Static Site Generation SSG)
  output: "export",
  distDir: "build",
  images: {
    unoptimized: true, // Disable Image Optimization for compatibility
  },
  assetPrefix:
    process.env.NODE_ENV === "production"
      ? `${CUSTOM_ASSET_PREFIX}/`
      : undefined, // Custom URL prefix
};

export default withNextIntl(nextConfig);
