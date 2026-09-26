import { CircleCheck, CircleX, TriangleAlert } from 'lucide-react'
import type { BudgetStatus, PurchaseDecision } from '../types'

export type Tone = 'safe' | 'warning' | 'critical'

/** «Лучше отложить» из-за минуса на счёте выглядит так же, как критический статус. */
export function toneOf(status: BudgetStatus | PurchaseDecision): Tone {
  return status === 'not_recommended' ? 'critical' : status
}

/** Фон крупных карточек в цвет статуса: зелёный, янтарный, красный. */
export const TONE_CARD_CLASSES: Record<Tone, string> = {
  safe: 'bg-emerald-50 ring-emerald-200',
  warning: 'bg-amber-50 ring-amber-200',
  critical: 'bg-red-50 ring-red-200',
}

const TONE_BADGE_CLASSES: Record<Tone, string> = {
  safe: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  warning: 'bg-amber-100 text-amber-900 ring-amber-200',
  critical: 'bg-red-100 text-red-800 ring-red-200',
}

const TONE_ICONS = { safe: CircleCheck, warning: TriangleAlert, critical: CircleX }

export const BUDGET_LABELS: Record<BudgetStatus, string> = {
  safe: 'Бюджет в норме',
  warning: 'Бюджет напряжённый',
  critical: 'Свободных денег нет',
}

export const DECISION_LABELS: Record<PurchaseDecision, string> = {
  safe: 'Можно купить',
  warning: 'Можно купить, но с осторожностью',
  critical: 'Лучше отложить',
  not_recommended: 'Лучше отложить',
}

type StatusBadgeProps =
  | { kind: 'budget'; status: BudgetStatus }
  | { kind: 'purchase'; status: PurchaseDecision }

export default function StatusBadge(props: StatusBadgeProps) {
  const label = props.kind === 'budget' ? BUDGET_LABELS[props.status] : DECISION_LABELS[props.status]
  const tone = toneOf(props.status)
  const Icon = TONE_ICONS[tone]

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${TONE_BADGE_CLASSES[tone]}`}
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </span>
  )
}
