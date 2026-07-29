import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import path from 'path'

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['@thatopen/fragments', 'web-ifc'],
  },
  worker: {
    format: 'es',
  },
  build: {
    // Disable chunk size warning
    chunkSizeWarningLimit: 10000,
    rollupOptions: {
      output: {
        // Manual chunking to avoid OOM during build
        manualChunks: {
          'three': ['three'],
          'thatopen': ['@thatopen/fragments', '@thatopen/components'],
          'react': ['react', 'react-dom'],
        }
      }
    }
  }
})
