import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` (e.g., .env.production)
  const env = loadEnv(mode, process.cwd(), "");

  // Custom URL prefix e.g. /SpielZettel
  const assetPrefix = mode === "production" ? env.CUSTOM_ASSET_PREFIX : "";

  return {
    plugins: [react()],
    base: assetPrefix ? `${assetPrefix}/` : "/",
    build: {
      outDir: "build",
      rolldownOptions: {
        output: {
          /*
          manualChunks: {
            "react-vendor": ["react", "react-dom"],
            router: ["react-router"],
          },
          */
          codeSplitting: {
            minSize: 20000,
            groups: [
              {
                name: "react-vendor",
                test: /node_modules[\\/]react/,
                priority: 20,
              },
              {
                name: "vendor",
                test: /node_modules/,
                priority: 10,
              },
            ],
          },
        },
      },
    },
  };
});
