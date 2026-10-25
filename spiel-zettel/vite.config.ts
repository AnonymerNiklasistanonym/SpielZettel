import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` (e.g., .env.production)
  const env = loadEnv(mode, process.cwd(), "");

  // Custom URL prefix e.g. /SpielZettel
  const assetPrefix = mode === "production" ? env.CUSTOM_ASSET_PREFIX : "";

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        manifest: {
          name: "My App",
          short_name: "MyApp",
          description: "My Progressive Web App",
          theme_color: "#ffffff",
          background_color: "#ffffff",
          display: "standalone",
          start_url: "/",
          icons: [
            {
              src: "/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
            },
          ],
        },
      }),
    ],
    base: assetPrefix ? `${assetPrefix}/` : "/",
    build: {
      outDir: "build",
      rolldownOptions: {
        output: {
          // Split dependencies into smaller chunks by their domain
          codeSplitting: {
            groups: [
              {
                name: "vendor-react",
                test: /node_modules[\\/](react|react-dom)[\\/]/,
                priority: 30,
              },
              {
                name: "vendor-react-router",
                test: /node_modules[\\/]react-router[\\/]/,
                priority: 30,
              },
              {
                name: "vendor-react-qrcode",
                test: /node_modules[\\/]qrcode\.react[\\/]/,
                priority: 30,
              },
              {
                name: "vendor-react-toasts",
                test: /node_modules[\\/]react-toastify[\\/]/,
                priority: 30,
              },
              {
                name: "vendor-react-i18n",
                test: /node_modules[\\/](react-i18next|i18next|i18next-browser-languagedetector|i18next-http-backend)[\\/]/,
                priority: 30,
              },
              {
                name: "vendor-react-other",
                test: /node_modules[\\/].*react.*[\\/]/,
                priority: 20,
              },
              {
                name: "vendor-other",
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
