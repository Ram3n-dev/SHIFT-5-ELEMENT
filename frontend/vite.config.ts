import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // В разработке запросы к API и возврат из Google уходят на .NET backend (dotnet run слушает порт 5080).
    // Заголовок Host остаётся localhost:5173 — поэтому в Google Cloud указываем http://localhost:5173/signin-google.
    proxy: {
      '/api': 'http://localhost:5080',
      '/signin-google': 'http://localhost:5080',
    },
  },
})
