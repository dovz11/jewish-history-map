import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // relative base so the build works from any sub-path (GitHub Pages, Netlify, a folder)
  base: './',
  plugins: [react()],
  build: {
    // three.js is large; it is already split into the lazily loaded scene chunk
    chunkSizeWarningLimit: 1400,
  },
})
