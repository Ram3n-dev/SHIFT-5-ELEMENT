import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import StatusBadge, { TONE_CARD_CLASSES, toneOf } from './StatusBadge'
import { Button, ErrorState, Spinner, buttonClass } from './ui'
import { formatRub } from '../lib/format'
import type { CalcStatus } from '../state/BudgetContext'
import type { CalculateResponse } from '../types'

interface Props {
  calculation: CalculateResponse | null
  status: CalcStatus
  error: string | null
  onRetry: () => void
}

/** Главная карточка: сколько можно тратить в день. */
export default function DailyLimitCard({ calculation, status, error, onRetry }: Props) {
  if (status === 'error') {
    return (
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 text-sm font-medium text-slate-600">Можно тратить</h2>
        <ErrorState message={error ?? 'Не удалось рассчитать лимит.'}>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Повторить
          </Button>
          <Link to="/settings" className={buttonClass('ghost', 'sm')}>
            Открыть настройки
          </Link>
        </ErrorState>
      </section>
    )
  }

  if (!calculation) {
    return (
      <section aria-busy="true" className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-sm font-medium text-slate-600">Можно тратить</h2>
        <div className="mt-2 h-12 w-44 animate-pulse rounded-xl bg-slate-200" />
        <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
          <Spinner className="size-4" />
          Считаем лимит…
        </p>
      </section>
    )
  }

  return (
    <section
      aria-live="polite"
      className={`rounded-3xl p-5 shadow-sm ring-1 ${TONE_CARD_CLASSES[toneOf(calculation.status)]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-medium text-slate-600">Можно тратить</h2>
        {status === 'loading' && <Spinner className="size-4 text-slate-400" />}
      </div>
      <p className="mt-1 text-5xl font-bold tracking-tight text-slate-900 tabular-nums">
        {formatRub(calculation.daily_limit)}
      </p>
      <p className="text-lg font-medium text-slate-700">в день</p>
      <div className="mt-4 flex flex-col gap-2">
        <StatusBadge kind="budget" status={calculation.status} />
        <p className="text-sm text-slate-700">{calculation.message}</p>
      </div>
    </section>
  )
}
