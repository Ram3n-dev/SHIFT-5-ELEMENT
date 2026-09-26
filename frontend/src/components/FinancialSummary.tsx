import { Card } from './ui'
import { formatRub } from '../lib/format'
import type { CalculateResponse } from '../types'

/** Из чего складывается лимит: все числа приходят с backend. */
export default function FinancialSummary({ calculation }: { calculation: CalculateResponse }) {
  const shortage = calculation.free_money < 0

  const rows = [
    { label: 'Доступно сейчас', value: formatRub(calculation.total_balance) },
    { label: 'Обязательные траты', value: formatRub(-calculation.mandatory_expenses) },
    { label: 'Резерв', value: formatRub(-calculation.reserve) },
  ]

  return (
    <Card>
      <h2 className="text-base font-semibold">Сводка до стипендии</h2>
      <dl className="mt-2 divide-y divide-slate-100">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-slate-600">{row.label}</dt>
            <dd className="font-medium tabular-nums">{row.value}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 pt-3">
          <dt className="font-semibold">{shortage ? 'Не хватает до стипендии' : 'Свободно до стипендии'}</dt>
          <dd className={`text-lg font-bold tabular-nums ${shortage ? 'text-red-700' : 'text-teal-700'}`}>
            {formatRub(Math.abs(calculation.free_money))}
          </dd>
        </div>
      </dl>
    </Card>
  )
}
