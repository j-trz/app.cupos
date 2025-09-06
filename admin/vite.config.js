import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Configuración de desarrollo
  server: {
    port: 3000,
    open: true,
    host: true,
    cors: {
      origin: [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://hdsmvuwrdwfivujjnubr.supabase.co",
        // Agregar dominios de producción según necesidad
      ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Origin",
        "apikey",
      ],
    },
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    },
  },

  // Configuración de build para producción
  build: {
    outDir: "dist",
    sourcemap: false, // Desactivar sourcemaps en producción por seguridad
    minify: "esbuild",
    target: "esnext",

    // Optimización de chunks
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core
          if (id.includes("react") || id.includes("react-dom")) {
            return "react-vendor";
          }

          // Supabase
          if (id.includes("@supabase/supabase-js")) {
            return "supabase";
          }

          // UI libraries
          if (id.includes("@headlessui/react") || id.includes("sweetalert2")) {
            return "ui-libs";
          }

          // Icons (separate chunk as they can be large)
          if (id.includes("react-icons")) {
            return "icons";
          }

          // Router
          if (id.includes("react-router-dom")) {
            return "router";
          }

          // Node modules (catch-all for other dependencies)
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },

    // Configuración de assets
    assetsDir: "assets",
    chunkSizeWarningLimit: 500,
  },

  // Optimización de dependencias
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@supabase/supabase-js",
      "@headlessui/react",
      "react-router-dom",
      "sweetalert2",
      "react-icons/fa",
    ],
  },

  // Variables de entorno se manejan automáticamente por Vite
  define: {
    // Variables globales disponibles en la aplicación
    __APP_VERSION__: JSON.stringify("1.0.0"),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    __DEV__: JSON.stringify(false), // Se configura en tiempo de build
  },

  // Validación de variables de entorno críticas
  envPrefix: ["VITE_"],

  // Configuración de preview (para testing del build)
  preview: {
    port: 4173,
    strictPort: true,
    cors: true,
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Cache-Control": "public, max-age=31536000",
    },
  },
});
