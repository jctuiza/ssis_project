import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Stand-alone React app (no Laravel plugin). In development, requests to /api are forwarded to the Laravel server
// (php artisan serve, port 8000), so the app can keep calling "/api". In production set VITE_API_URL instead (see .env.example).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } },
  },
})
