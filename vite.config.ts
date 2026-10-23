import { defineConfig } from 'vite';

// Configuración mínima: la app vive en la raíz (index.html) y lee el run de
// referencia directamente desde results/, así la UI nunca usa datos inventados.
export default defineConfig({
  base: './',
  worker: { format: 'es' },
});
