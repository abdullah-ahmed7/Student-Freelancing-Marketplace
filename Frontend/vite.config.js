import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Dev convenience: with VITE_API_BASE_URL empty the app calls same-origin "/api", forwarded to the Express server.
  server: { proxy: { '/api': 'http://localhost:5000' } },
})
