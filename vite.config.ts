import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), basicSsl()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:8001",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("proxyReq", (_proxyReq, req) => {
            // Permitir que el proxy maneje correctamente el body del request
            if (req.headers["content-type"]?.includes("multipart/form-data")) {
              // No modificar nada para multipart
            }
          });
        },
      },
      "/uploads": {
        target: "http://localhost:8001",
        changeOrigin: true,
      },
    },
  },
});
