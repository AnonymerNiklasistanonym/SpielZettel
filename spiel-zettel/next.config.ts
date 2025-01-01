import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration for a static export (Static Site Generation SSG)
  output: 'export',
  distDir: 'build',
  images: {
    unoptimized: true, // Disable Image Optimization for compatibility
  },
  assetPrefix: process.env.NODE_ENV === 'production' ? '/SpielZettel/' : undefined, // Custom URL prefix
};

export default nextConfig;
