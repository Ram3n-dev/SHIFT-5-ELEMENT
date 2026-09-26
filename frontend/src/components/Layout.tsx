import { NavLink, Outlet } from 'react-router-dom'
import { ArrowLeftRight, Lock, Settings, ShoppingBag, Wallet, type LucideIcon } from 'lucide-react'
import Logo from './Logo'
import PrivacyNotice from './PrivacyNotice'

const NAV_ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/dashboard', label: 'Главная', icon: Wallet },
  { to: '/operations', label: 'Операции', icon: ArrowLeftRight },
  { to: '/purchase', label: 'Покупка', icon: ShoppingBag },
  { to: '/settings', label: 'Настройки', icon: Settings },
]

/** Общий каркас экранов после онбординга: шапка, содержимое, нижнее меню. */
export default function Layout() {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
          <Logo />
          <span className="flex items-center gap-1 text-right text-xs text-slate-500">
            <Lock className="size-3.5 shrink-0" aria-hidden="true" />
            Данные только на этом устройстве
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-32 pt-5">
        <Outlet />
        <PrivacyNotice className="mt-10" />
      </main>

      <nav
        aria-label="Основное меню"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                  isActive ? 'text-teal-700' : 'text-slate-500 hover:text-slate-800'
                }`
              }
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
