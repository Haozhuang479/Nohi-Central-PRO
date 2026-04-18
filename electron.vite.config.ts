import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'

// Set ANALYZE=1 when building to emit out/renderer/stats.html with a treemap of
// every chunk's composition. Quick way to catch bundle bloat before release.
const analyze = process.env.ANALYZE === '1'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve('electron/main/index.ts'),
      },
    },
    resolve: {
      alias: { '@engine': resolve('electron/main/engine') },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve('electron/preload/index.ts'),
      },
    },
  },
  renderer: {
    root: resolve('src'),
    build: {
      rollupOptions: {
        input: resolve('src/index.html'),
      },
    },
    resolve: {
      alias: { '@': resolve('src') },
    },
    plugins: [
      tailwindcss(),
      react(),
      analyze && visualizer({
        filename: 'out/renderer/stats.html',
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
      }),
    ].filter(Boolean),
  },
})
