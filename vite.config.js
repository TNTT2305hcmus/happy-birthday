import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Three.js lives in a lazy WebGL chunk; the initial React/CSS shell remains much smaller.
    chunkSizeWarningLimit: 550,
  },
})
