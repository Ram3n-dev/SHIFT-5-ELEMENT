import { X } from 'lucide-react'
import { useApp } from '../state/AppContext'
import Raccoon from './Raccoon'

/** Всплывающие сообщения и напоминания Енота. Закрываются сами через 7 секунд. */
export default function Toasts() {
  const { toasts, dismissToast } = useApp()
  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 top-3 z-[60] flex flex-col items-center gap-2 lg:inset-x-auto lg:right-6 lg:top-6 lg:items-end"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="pop-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-3xl border border-line bg-card p-3 pr-2 shadow-lg"
        >
          <Raccoon pose={toast.pose ?? 'calm'} size={48} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">{toast.title}</p>
            {toast.text && <p className="text-sm text-muted">{toast.text}</p>}
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Скрыть уведомление"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-chip"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
