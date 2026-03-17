import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [react(), tailwindcss(), basicSsl()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    server: {
      host: true, // Listen on all local IPs
      hmr: process.env.DISABLE_HMR !== "true",
      proxy: {
        // Proxy WebSocket ke backend saat development
        "/ws": {
          target: env.VITE_WS_URL ? undefined : "ws://localhost:3001",
          ws: true,
          changeOrigin: true,
        }, // Proxy REST API ke backend saat development
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
      },
    },
  };
});
