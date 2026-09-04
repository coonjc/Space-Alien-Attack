import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Main game entry.
        main: resolve(__dirname, 'index.html'),
        // Internal admin dashboard (ban/delete player accounts) — built as
        // a separate page so it ships without pulling Phaser into its bundle.
        admin: resolve(__dirname, 'admin.html')
      }
    }
  }
});
