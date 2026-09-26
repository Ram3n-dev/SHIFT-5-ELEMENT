import { DECISION_LABELS, TONE_CARD_CLASSES, toneOf } from './StatusBadge'
import { formatRub, formatSignedRub } from '../lib/format'
import type { PurchaseCheckResponse } from '../types'

interface Props {
  name: string
  amount: number
  result: PurchaseCheckResponse
}

export default function PurchaseResult({ name, amount, result }: Props) {
  const rows = [
    { label: 'До покупки', value: `${formatRub(result.daily_limit_before)} в день` },
    { label: 'После покупки', value: `${formatRub(result.daily_limit_after)} в день` },
    { label: 'Изменение', value: `${formatSignedRub(result.limit_change)} в день` },
  ]

  return (
    <section aria-live="polite" className={`rounded-3xl p-5 shadow-sm ring-1 ${TONE_CARD_CLASSES[toneOf(result.decision)]}`}>
      <p className="text-sm text-slate-600">
        {name} · {formatRub(amount)}
      </p>
      <h2 className="mt-1 text-2xl font-bold text-slate-900">{DECISION_LABELS[result.decision]}</h2>

      <dl className="mt-4 divide-y divide-slate-900/10">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 py-2">
            <dt className="text-slate-600">{row.label}</dt>
            <dd className="font-semibold tabular-nums text-slate-900">{row.value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-sm text-slate-700">{result.message}</p>
      <p className="mt-2 text-xs text-slate-500">Останется на счетах после покупки: {formatRub(result.balance_after)}</p>
    </section>
  )
}
