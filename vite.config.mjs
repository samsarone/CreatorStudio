import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


export default defineConfig({
  plugins: [react(),
    tailwindcss()
  ],
  build: {
    outDir: 'dist_build',
    // The app intentionally ships multiple editor surfaces in one entry bundle today.
    // Keep the warning active for meaningful growth beyond the current ~2.7 MB output.
    chunkSizeWarningLimit: 3000,
  },
})
