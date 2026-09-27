import { Repeat, Trash2 } from 'lucide-react'
<<<<<<< HEAD
import { categoryIcon, operationLabel } from '../lib/categories'
=======
import { categoryIcon } from '../lib/categories'
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
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
<<<<<<< HEAD
        const spent = items
          .filter((item) => item.type === 'expense' || operationLabel(item.category, item.description) === 'Налоги')
          .reduce((sum, item) => sum + item.amount, 0)
=======
        const spent = items.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
        return (
          <section key={date} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between px-1">
              <h2 className="font-semibold text-ink">{formatDayTitle(date)}</h2>
              {spent > 0 && <span className="text-sm text-muted">{formatRub(-spent)}</span>}
            </div>
            <ul className="overflow-hidden rounded-3xl bg-card">
              {items.map((item) => {
<<<<<<< HEAD
                const title = operationLabel(item.category, item.description)
                const Icon = categoryIcon(title === 'Налоги' ? 'Налоги' : item.category)
                const expense = item.type === 'expense' || title === 'Налоги'
                const showCategory = title === item.description.trim() && title !== item.category
=======
                const Icon = categoryIcon(item.category)
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
                return (
                  <li key={item.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-chip text-ink" aria-hidden="true">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
<<<<<<< HEAD
                      <p className="truncate font-medium text-ink">{title}</p>
                      <p className="flex items-center gap-1 truncate text-sm text-muted">
                        {showCategory && item.category}
                        {showCategory && item.account_name && ' · '}
                        {item.account_name}
=======
                      <p className="truncate font-medium text-ink">{item.description}</p>
                      <p className="flex items-center gap-1 truncate text-sm text-muted">
                        {item.category}
                        {item.account_name && ` · ${item.account_name}`}
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
                        {item.is_mandatory && ' · обязательная'}
                        {item.is_recurring && <Repeat className="h-3.5 w-3.5 shrink-0" aria-label="регулярный платёж" />}
                      </p>
                    </div>
<<<<<<< HEAD
                    <span className={`shrink-0 font-semibold ${expense ? 'text-ink' : 'text-ok'}`}>
                      {formatSignedRub(expense ? -item.amount : item.amount)}
=======
                    <span className={`shrink-0 font-semibold ${item.type === 'income' ? 'text-ok' : 'text-ink'}`}>
                      {formatSignedRub(item.type === 'income' ? item.amount : -item.amount)}
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
                    </span>
                    <button
                      type="button"
                      onClick={() => onDelete(item)}
<<<<<<< HEAD
                      aria-label={`Удалить: ${title}`}
=======
                      aria-label={`Удалить: ${item.description}`}
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
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
