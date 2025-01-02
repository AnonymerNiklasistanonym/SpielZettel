import type { NextConfig } from "next";
import nextPwa from "next-pwa";

// e.g. /SpielZettel
const CUSTOM_ASSET_PREFIX = process.env.CUSTOM_ASSET_PREFIX ?? "";

const nextConfig: NextConfig = {
  // Configuration for a static export (Static Site Generation SSG)
  output: 'export',
  distDir: 'build',
  images: {
    unoptimized: true, // Disable Image Optimization for compatibility
  },
  assetPrefix: process.env.NODE_ENV === 'production' ? `${CUSTOM_ASSET_PREFIX}/` : undefined, // Custom URL prefix
};

//export default nextConfig;

const nextConfigWithPWA = nextPwa({
  dest: "public",
});

export default nextConfigWithPWA(nextConfig);
