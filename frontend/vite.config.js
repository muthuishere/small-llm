import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080'
    }
  },
  // WebLLM ships ES-module workers; must preserve the format
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@mlc-ai/web-llm'],
  },
  build: {
    // WebLLM WASM chunks are intentionally large — suppress the warning
    chunkSizeWarningLimit: 10000,
    rollupOptions: {
      output: {
        manualChunks: {
          'webllm':  ['@mlc-ai/web-llm'],
          'react':   ['react', 'react-dom'],
          'mui':     ['@mui/material', '@mui/icons-material'],
          'radix':   [
            '@radix-ui/react-tabs',
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-tooltip',
          ],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    exclude: ['node_modules', 'dist'],
  },
})
