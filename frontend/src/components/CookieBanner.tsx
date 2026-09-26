import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cookie } from 'lucide-react'
import { getCookieChoice, saveCookieChoice, type CookieChoice } from '../lib/consent'
import { Button } from './ui'

/** Событие, по которому баннер открывается снова (кнопка «Настройки cookie» в профиле). */
export const OPEN_COOKIE_BANNER = 'lp:open-cookie-banner'

/**
 * Баннер cookie. Обязательные cookie (вход) работают всегда — без них нельзя войти.
 * Анонимная статистика экранов включается, только если пользователь нажал «Разрешить всё».
 */
export default function CookieBanner() {
  const [visible, setVisible] = useState(() => getCookieChoice() === null)

  useEffect(() => {
    const open = () => setVisible(true)
    window.addEventListener(OPEN_COOKIE_BANNER, open)
    return () => window.removeEventListener(OPEN_COOKIE_BANNER, open)
  }, [])

  if (!visible) return null

  const choose = (choice: CookieChoice) => {
    setVisible(false)
    saveCookieChoice(choice)
  }

  return (
    <div
      role="region"
      aria-label="Согласие на cookie"
      className="slide-up fixed inset-x-3 bottom-24 z-40 mx-auto max-w-xl rounded-3xl border border-line bg-card p-4 shadow-lg sm:inset-x-6 lg:bottom-6 lg:left-auto lg:mr-6"
    >
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-chip text-ink" aria-hidden="true">
          <Cookie className="h-5 w-5" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-ink">Cookie и статистика</p>
          <p className="text-sm text-muted">
            Обязательные cookie нужны, чтобы ты оставался в аккаунте. С твоего согласия браузер ещё сообщает, какие экраны открывались, —
            без привязки к аккаунту и без сумм.{' '}
            <Link to="/privacy" className="font-medium text-ink underline">
              Подробнее
            </Link>
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" size="sm" onClick={() => choose('necessary')}>
          Только обязательные
        </Button>
        <Button size="sm" onClick={() => choose('all')}>
          Разрешить всё
        </Button>
      </div>
    </div>
  )
}
