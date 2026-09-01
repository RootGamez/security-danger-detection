import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Escucha en todas las interfaces para poder abrir el dashboard desde el
    // móvil de la misma red mientras se prueba una cámara.
    host: true,
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
