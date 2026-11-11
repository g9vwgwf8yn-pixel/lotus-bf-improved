import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/terms': 'http://127.0.0.1:5000',
      '/query': 'http://127.0.0.1:5000',
      '/help': 'http://127.0.0.1:5000',
    }
  }
})
