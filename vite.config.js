import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    // We keep these for your local development environment
    allowedHosts: [
      'localhost',
      '127.0.0.1'
    ]
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Helps with large icon libraries like Lucide
    chunkSizeWarningLimit: 1000, 
  }
})