import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import basicSsl from "@vitejs/plugin-basic-ssl"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

// `--mode lan` serves self-signed HTTPS so phones on the LAN get a secure context (required for WebRTC/camera).
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    mode === "lan" && basicSsl(),
    VitePWA({
      // The user picks when to reload: a reload ends the live chat.
      registerType: "prompt",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "P2P Chat",
        short_name: "P2P Chat",
        description:
          "Private one-to-one chat and calls, straight between two devices.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#f5f2eb",
        theme_color: "#f5f2eb",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Default globs skip .wasm (QR scanner fallback) and .woff2 (font), which then fail offline.
        globPatterns: ["**/*.{js,css,html,svg,png,wasm,woff2}"],
        navigateFallback: "/index.html",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
}))
