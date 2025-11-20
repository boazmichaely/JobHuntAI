import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // CRITICAL: Must be relative for Electron to find assets
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY) 
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})