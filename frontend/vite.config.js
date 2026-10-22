import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  optimizeDeps: {
    // Libraries loaded with import() only when needed. Pre-bundle them when the
    // dev server starts; otherwise Vite discovers them mid-session, re-bundles,
    // and the open page fails with "504 Outdated Optimize Dep" (a blank page).
    include: ['lottie-react', 'exifr'],
  },
})
