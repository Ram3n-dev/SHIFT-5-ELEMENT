import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // В режиме разработки запросы /api уходят на .NET backend (dotnet run слушает порт 5080)
    proxy: {
      '/api': 'http://localhost:5080',
    },
  },
})
