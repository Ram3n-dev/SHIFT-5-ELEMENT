import type { Theme } from './types'

// Тема: светлая, тёмная или как в системе. Выбор хранится в профиле на сервере,
// а копия в браузере нужна, чтобы экран входа сразу открылся в нужной теме.

const STORAGE_KEY = 'lp_theme'
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')

export function savedTheme(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

let current: Theme = 'system'

function paint() {
  const dark = current === 'dark' || (current === 'system' && darkQuery.matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

export function applyTheme(theme: Theme) {
  current = theme
  paint()
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Браузер запретил хранилище — тема всё равно применится до перезагрузки.
  }
}

// «Как в системе»: переключаемся вместе с системой без перезагрузки.
darkQuery.addEventListener('change', paint)
