import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const backend = 'http://localhost:5288'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': {
        target: backend,
        changeOrigin: true,
      },
      '/onboarding': {
        target: backend,
        changeOrigin: true,
      },
      '/projects': {
        target: backend,
        changeOrigin: true,
      },
      '/opportunities': {
        target: backend,
        changeOrigin: true,
      },
      '/change-requests': {
        target: backend,
        changeOrigin: true,
      },
      '/dashboard': {
        target: backend,
        changeOrigin: true,
      },
      '/workspace': {
        target: backend,
        changeOrigin: true,
      },
      '/jobs': {
        target: backend,
        changeOrigin: true,
      },
      '/api': {
        target: backend,
        changeOrigin: true,
      },
    },
  },
})
