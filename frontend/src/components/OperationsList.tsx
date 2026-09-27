import { Repeat, Trash2 } from 'lucide-react'
import { categoryIcon, operationLabel } from '../lib/categories'
import { formatDayTitle, formatRub, formatSignedRub } from '../lib/format'
import type { Operation } from '../lib/types'

/** Операции по дням: «Сегодня», «Вчера», «24 сентября». Итог дня — только траты. */
export default function OperationsList({ operations, onDelete }: { operations: Operation[]; onDelete: (operation: Operation) => void }) {
  const groups = new Map<string, Operation[]>()
  for (const operation of operations) {
    const list = groups.get(operation.date) ?? []
    list.push(operation)
    groups.set(operation.date, list)
  }
  const dates = [...groups.keys()].sort((a, b) => b.localeCompare(a))

  return (
    <div className="flex flex-col gap-4">
      {dates.map((date) => {
        const items = groups.get(date)!
        const spent = items
          .filter((item) => item.type === 'expense' || operationLabel(item.category, item.description) === 'Налоги')
          .reduce((sum, item) => sum + item.amount, 0)
        return (
          <section key={date} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between px-1">
              <h2 className="font-semibold text-ink">{formatDayTitle(date)}</h2>
              {spent > 0 && <span className="text-sm text-muted">{formatRub(-spent)}</span>}
            </div>
            <ul className="overflow-hidden rounded-3xl bg-card">
              {items.map((item) => {
                const title = operationLabel(item.category, item.description)
                const Icon = categoryIcon(title === 'Налоги' ? 'Налоги' : item.category)
                const expense = item.type === 'expense' || title === 'Налоги'
                const showCategory = title === item.description.trim() && title !== item.category
                return (
                  <li key={item.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-chip text-ink" aria-hidden="true">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{title}</p>
                      <p className="flex items-center gap-1 truncate text-sm text-muted">
                        {showCategory && item.category}
                        {showCategory && item.account_name && ' · '}
                        {item.account_name}
                        {item.is_mandatory && ' · обязательная'}
                        {item.is_recurring && <Repeat className="h-3.5 w-3.5 shrink-0" aria-label="регулярный платёж" />}
                      </p>
                    </div>
                    <span className={`shrink-0 font-semibold ${expense ? 'text-ink' : 'text-ok'}`}>
                      {formatSignedRub(expense ? -item.amount : item.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDelete(item)}
                      aria-label={`Удалить: ${title}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-chip hover:text-bad"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
