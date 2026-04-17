import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite will forward any request starting with /api to Django running on port 8000
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
