import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { BadgePercent, House, List, MessageCircle, Plus, ShoppingBag, UserRound, type LucideIcon } from 'lucide-react'
import { trackEvent } from '../lib/consent'
import { useApp } from '../state/AppContext'
import AddExpenseSheet from './AddExpenseSheet'
import Logo from './Logo'
import Raccoon from './Raccoon'
import Reminders from './Reminders'
import Toasts from './Toasts'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const HOME: NavItem = { to: '/dashboard', label: 'Главная', icon: House }
const OPERATIONS: NavItem = { to: '/operations', label: 'Операции', icon: List }
const PURCHASE: NavItem = { to: '/purchase', label: 'Покупка', icon: ShoppingBag }
const CASHBACK: NavItem = { to: '/cashback', label: 'Кэшбэк', icon: BadgePercent }
const CHAT: NavItem = { to: '/chat', label: 'Енот', icon: MessageCircle }
const PROFILE: NavItem = { to: '/settings', label: 'Профиль', icon: UserRound }

/**
 * Каркас приложения. Телефон: верхняя строка с профилем и нижнее меню с жёлтой кнопкой «+».
 * Компьютер (от 1024 px): боковое меню слева, контент шире и в несколько колонок.
 */
export default function Layout() {
  const { me, openExpenseSheet } = useApp()
  const location = useLocation()
  const initial = (me?.user.name ?? '?').trim().charAt(0).toUpperCase()

  useEffect(() => {
    trackEvent(`screen:${location.pathname}`)
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-page">
      {/* Боковое меню — компьютер */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-6 border-r border-line bg-card px-4 py-6 lg:flex">
        <Link to="/dashboard" className="px-2">
          <Logo />
        </Link>
        <button
          type="button"
          onClick={() => openExpenseSheet()}
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-accent font-semibold text-accent-ink transition hover:brightness-95"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          Добавить трату
        </button>
        <nav aria-label="Основное меню" className="flex flex-col gap-1">
          {[HOME, OPERATIONS, PURCHASE, CASHBACK, CHAT, PROFILE].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex h-11 items-center gap-3 rounded-2xl px-3 font-medium transition ${isActive ? 'bg-chip text-ink' : 'text-muted hover:bg-chip hover:text-ink'}`
              }
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-2xl bg-chip p-3">
          <Raccoon pose="calm" size={44} />
          <p className="text-sm text-muted">Енот считает, ты решаешь. Советы — ориентир, а не рекомендация.</p>
        </div>
      </aside>

      {/* Верхняя строка — телефон */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-page px-4 pt-3 pb-2 lg:hidden">
        <Link to="/dashboard" aria-label="Лимит+ — на главную">
          <Logo />
        </Link>
        <NavLink
          to="/settings"
          aria-label="Профиль и настройки"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card font-bold text-ink"
        >
          {initial}
        </NavLink>
      </header>

      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-md px-4 pt-2 pb-28 sm:max-w-2xl lg:max-w-6xl lg:px-10 lg:pt-8 lg:pb-12">
          <Outlet />
        </main>
      </div>

      {/* Нижнее меню — телефон */}
      <nav
        aria-label="Основное меню"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 items-start border-t border-line bg-card px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <BottomLink item={HOME} />
        <BottomLink item={OPERATIONS} />
        <button
          type="button"
          onClick={() => openExpenseSheet()}
          aria-label="Добавить трату"
          className="-mt-6 flex h-14 w-14 items-center justify-center justify-self-center rounded-full bg-accent text-accent-ink shadow-lg transition active:scale-95"
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} aria-hidden="true" />
        </button>
        <BottomLink item={CASHBACK} />
        <BottomLink item={CHAT} />
      </nav>

      <AddExpenseSheet />
      <Reminders />
      <Toasts />
    </div>
  )
}

function BottomLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 text-[11px] font-semibold transition ${isActive ? 'text-ink' : 'text-muted'}`
      }
    >
      <item.icon className="h-6 w-6" aria-hidden="true" />
      {item.label}
    </NavLink>
  )
}
