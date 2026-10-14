import { defineConfig } from 'vitest/config';

// `base: './'` sorgt für relative Pfade im Build – das Spiel läuft damit
// auch in einem Unterordner (z. B. https://example.com/spiele/masskrug/).
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Phaser ist groß (~1,2 MB) – wir packen es in einen eigenen Chunk,
    // damit Browser es getrennt vom Spielcode cachen können.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'], howler: ['howler'] },
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
