import type { ReactNode } from 'react'
import { CalendarDays } from 'lucide-react'
import { Card } from './ui'
import { formatDate, formatRub } from '../lib/format'

export interface RecurringListItem {
  id: string
  name: string
  amount: number
  next_date: string
  enabled?: boolean
}

interface Props {
  title: string
  items: RecurringListItem[]
  emptyText: string
  /** Кнопки справа от платежа: «Оплачено» на главной, «Изменить» в настройках. */
  renderActions?: (item: RecurringListItem) => ReactNode
  children?: ReactNode
}

export default function RecurringExpensesList({ title, items, emptyText, renderActions, children }: Props) {
  return (
    <Card>
      <h2 className="text-base font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="mt-1 divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.id} className={`flex items-center gap-3 py-3 ${item.enabled === false ? 'opacity-60' : ''}`}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                <CalendarDays className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.name}</p>
                <p className="text-xs text-slate-500">
                  {formatDate(item.next_date)}
                  {item.enabled === false && ' · выключен'}
                </p>
              </div>
              <p className="font-semibold tabular-nums">{formatRub(item.amount)}</p>
              {renderActions?.(item)}
            </li>
          ))}
        </ul>
      )}
      {children}
    </Card>
  )
}
