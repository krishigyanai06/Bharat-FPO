import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Import theme for PWA manifest — single source of truth
const brand = process.env.VITE_BRAND || "Bharat FPO";
const shortName = process.env.VITE_SHORT_NAME || "Bharat FPO";
const primary = process.env.VITE_PRIMARY || "#16a34a";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: true },
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "icons/*.png"],
      manifest: {
        name: brand,
        short_name: shortName,
        description: `${brand} - Farm Management Dashboard`,
        theme_color: primary,
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "map-tiles-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/api\..*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
            },
          },
        ],
      },
    }),
  ],
  optimizeDeps: { exclude: ["lucide-react"] },
});
