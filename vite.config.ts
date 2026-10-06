import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Göreli yollar: itch.io alt dizinde ve Android WebView'da (Capacitor) çalışabilmesi için.
  base: './',
  worker: { format: 'es' },
  // PixiJS tek başına ~500 kB; Faz 0 için tek parça yeterli.
  build: { chunkSizeWarningLimit: 800 },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
