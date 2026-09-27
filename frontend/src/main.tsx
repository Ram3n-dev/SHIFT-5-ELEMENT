import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { applyTheme, savedTheme } from './lib/theme'
import './index.css'

// Тема из прошлого визита — чтобы экран не мигал светлым до загрузки профиля.
applyTheme(savedTheme())

// Service worker нужен только для системных уведомлений Енота. Файлы он не кэширует.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
