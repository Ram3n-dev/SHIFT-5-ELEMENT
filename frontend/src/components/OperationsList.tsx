import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { Card, EmptyState } from './ui'
import { formatDate, formatSignedRub } from '../lib/format'
import type { Account, Operation } from '../types'

type Filter = 'all' | 'expense' | 'income'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'expense', label: 'Расходы' },
  { value: 'income', label: 'Доходы' },
]

const PAGE_SIZE = 30

export default function OperationsList({ operations, accounts }: { operations: Operation[]; accounts: Account[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [showAll, setShowAll] = useState(false)

  const accountNames = new Map(accounts.map((account) => [account.id, account.name]))
  const filtered = operations
    .filter((operation) => filter === 'all' || operation.type === filter)
    .sort((a, b) => b.date.localeCompare(a.date))
  const visible = showAll ? filtered : filtered.slice(0, PAGE_SIZE)

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">История операций</h2>
        <div role="tablist" aria-label="Фильтр операций" className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={filter === item.value}
              onClick={() => setFilter(item.value)}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                filter === item.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title={operations.length === 0 ? 'Операций пока нет' : 'Таких операций нет'}
            text={operations.length === 0 ? 'Добавьте расход вручную или импортируйте учебную выписку.' : undefined}
          />
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100">
          {visible.map((operation) => {
            const income = operation.type === 'income'
            return (
              <li key={operation.id} className="flex items-center gap-3 py-3">
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${
                    income ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {income ? (
                    <ArrowDownLeft className="size-5" aria-label="Доход" />
                  ) : (
                    <ArrowUpRight className="size-5" aria-label="Расход" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium">{operation.description || operation.category}</p>
                  <p className="text-xs text-slate-500">
                    {operation.category} · {accountNames.get(operation.account_id) ?? 'удалённый счёт'} ·{' '}
                    {formatDate(operation.date)}
                  </p>
                  {(operation.is_mandatory || operation.is_recurring) && (
                    <p className="mt-1 flex gap-1">
                      {operation.is_mandatory && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                          обязательная
                        </span>
                      )}
                      {operation.is_recurring && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                          регулярная
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <p className={`font-semibold tabular-nums ${income ? 'text-emerald-700' : 'text-slate-900'}`}>
                  {formatSignedRub(income ? operation.amount : -operation.amount)}
                </p>
              </li>
            )
          })}
        </ul>
      )}

      {!showAll && filtered.length > PAGE_SIZE && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-3 w-full cursor-pointer rounded-xl py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
        >
          Показать все ({filtered.length})
        </button>
      )}
    </Card>
  )
}
