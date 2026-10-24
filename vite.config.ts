import { defineConfig } from 'vite';

// Configuración mínima: la app vive en la raíz (index.html) y lee el run de
// referencia directamente desde results/, así la UI nunca usa datos inventados.
export default defineConfig({
  base: './',
  worker: { format: 'es' },
  // PostCSS vacío y explícito: sin esto Vite busca un postcss.config.js en las
  // carpetas superiores y puede aplicar la configuración de otro proyecto.
  css: { postcss: {} },
  build: {
    // Three.js va en su propio archivo (cambia poco y el navegador lo guarda en caché);
    // el resto pesa por las costas 1:50 m y el historial del run de referencia.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: { three: ['three'] },
      },
    },
  },
});
