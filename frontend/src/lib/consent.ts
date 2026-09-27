// Согласие на cookie. Выбор хранится в cookie lp_consent на 180 дней и дублируется на сервер (таблица consents).
//
// necessary — только обязательные cookie: вход (lp_auth) и защита входа через Google.
// all       — ещё и анонимная статистика: какие экраны открывают. Без неё события не отправляются вообще.

import { api } from './api'

export type CookieChoice = 'necessary' | 'all'

const COOKIE_NAME = 'lp_consent'
const MAX_AGE_SECONDS = 180 * 24 * 60 * 60

export function getCookieChoice(): CookieChoice | null {
  const match = document.cookie.match(/(?:^|;\s*)lp_consent=(necessary|all)(?:;|$)/)
  return match ? (match[1] as CookieChoice) : null
}

export async function saveCookieChoice(choice: CookieChoice): Promise<void> {
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${COOKIE_NAME}=${choice}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`
  try {
    await api.consent('cookies', choice)
  } catch {
    // Выбор уже сохранён в браузере. Запись на сервере — для отчётности, её можно пропустить.
  }
}

/** Сбрасывает выбор — баннер покажется снова. */
export function resetCookieChoice() {
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`
}

/** Анонимное событие «открыт экран». Уходит, только если пользователь нажал «Разрешить всё». */
export function trackEvent(name: string) {
  if (getCookieChoice() !== 'all') return
  api.event(name).catch(() => {})
}
