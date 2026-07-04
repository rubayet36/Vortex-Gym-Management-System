import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // All /api/* requests from the React dev-server will be forwarded to XAMPP
      '/api': {
        target: 'http://localhost',  // XAMPP default port 80
        changeOrigin: true,
        // No rewrite needed: /api/profiles.php stays as /api/profiles.php
      },
    },
  },
})

