import { Card } from './ui'
import { daysBetween, formatDate, pluralDays, todayISO } from '../lib/format'
import type { BudgetSettings } from '../types'

interface Props {
  settings: BudgetSettings
  /** Дни до стипендии из расчёта backend. null — расчёт ещё не готов. */
  days: number | null
}

/** «До стипендии: 10 дней» и полоска: какая часть периода уже прошла. */
export default function StipendCountdown({ settings, days }: Props) {
  const periodLength = daysBetween(settings.period_start, settings.stipend_date)
  const passed = daysBetween(settings.period_start, todayISO())
  const progress = periodLength > 0 ? Math.min(100, Math.max(0, Math.round((passed / periodLength) * 100))) : 0

  return (
    <Card>
      <h1 className="text-lg font-semibold">
        {days !== null ? `До стипендии: ${days} ${pluralDays(days)}` : 'До стипендии'}
      </h1>
      <div
        role="progressbar"
        aria-label={days !== null ? `Осталось ${days} ${pluralDays(days)} до стипендии` : 'Прогресс до стипендии'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100"
      >
        <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-500">Следующая стипендия — {formatDate(settings.stipend_date)}</p>
    </Card>
  )
}
