import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, FileUp, Plus } from 'lucide-react'
import BankImport from '../components/BankImport'
import ConfirmDialog from '../components/ConfirmDialog'
import CsvImport from '../components/CsvImport'
import OperationsList from '../components/OperationsList'
import Raccoon from '../components/Raccoon'
import { Button, Card, Chip, ErrorNote, PageTitle, Spinner, StatusDot, TileLabel } from '../components/ui'
import { api } from '../lib/api'
import { categoryTitle, operationLabel } from '../lib/categories'
import { demoStatement } from '../lib/demoStatement'
import { formatRub, formatSignedRub, pluralDays, toISODate } from '../lib/format'
import type { Analytics, Operation } from '../lib/types'
import { useApp } from '../state/AppContext'

type Filter = 'all' | 'expense' | 'income'

function historyFrom() {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 6)
  return toISODate(date)
}

export default function OperationsPage() {
  const { version, dataChanged, openExpenseSheet, dashboard, showToast } = useApp()
  const [operations, setOperations] = useState<Operation[] | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [importOpen, setImportOpen] = useState(false)
  const [bankOpen, setBankOpen] = useState(false)
  const [deleting, setDeleting] = useState<Operation | null>(null)
  const [demoBusy, setDemoBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([api.operations(historyFrom()), api.analytics()])
      .then(([list, stats]) => {
        if (cancelled) return
        setOperations(list)
        setAnalytics(stats)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Не удалось загрузить операции.')
      })
    return () => {
      cancelled = true
    }
  }, [version])

  const visible = (operations ?? []).filter((item) => filter === 'all' || item.type === filter)
  const accounts = (dashboard?.accounts ?? []).filter((account) => account.type !== 'savings')

  const addDemo = async () => {
    setDemoBusy(true)
    setError(null)
    try {
      const available = accounts.length > 0 ? accounts : (await api.accounts()).filter((account) => account.type !== 'savings')
      const account = available[0]
      if (!account) {
        setError('Сначала добавь счёт — демо-операции нужно к нему привязать.')
        return
      }
      const batch = demoStatement(account.id)
      await api.importOperations(account.id, batch, true)
      dataChanged()
      showToast({ title: 'Добавлено 15 операций', text: 'Учебная выписка. Баланс счёта не менялся.', pose: 'count' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось добавить демо-данные.')
    } finally {
      setDemoBusy(false)
    }
  }

  return (
    <div>
      <PageTitle
        title="Операции"
        subtitle="История операций"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setBankOpen(true)}>
              <Building2 className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Банк</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
              <FileUp className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Импорт CSV</span>
              <span className="sm:hidden">CSV</span>
            </Button>
            <div className="hidden lg:block">
              <Button size="sm" onClick={() => openExpenseSheet()}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Добавить
              </Button>
            </div>
          </div>
        }
      />

      {error && <ErrorNote>{error}</ErrorNote>}
      {!operations && !error && <Spinner />}

      {operations && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={addDemo} loading={demoBusy}>
                Добавить демо-данные
              </Button>
              <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
                Все
              </Chip>
              <Chip active={filter === 'expense'} onClick={() => setFilter('expense')}>
                Траты
              </Chip>
              <Chip active={filter === 'income'} onClick={() => setFilter('income')}>
                Доходы
              </Chip>
            </div>

            {visible.length === 0 ? (
              <Card className="flex flex-col items-center gap-3 py-8 text-center">
                <Raccoon pose="sleep" size={96} />
                <p className="font-semibold text-ink">Пока пусто</p>
                <p className="max-w-xs text-sm text-muted">Запиши первую трату жёлтой кнопкой «+» или загрузи учебную выписку CSV.</p>
              </Card>
            ) : (
              <OperationsList operations={visible} onDelete={setDeleting} />
            )}
          </div>

          {analytics && <AnalyticsCard analytics={analytics} operations={operations} />}
        </div>
      )}

      <BankImport
        open={bankOpen}
        accounts={accounts}
        onClose={() => setBankOpen(false)}
        onImported={(count) => {
          dataChanged()
          showToast({ title: `Из банка: ${count}`, text: 'В приложении остались только обезличенные операции.', pose: 'count' })
        }}
      />

      <CsvImport
        open={importOpen}
        accounts={accounts}
        onClose={() => setImportOpen(false)}
        onImported={(count) => {
          dataChanged()
          showToast({ title: `Импортировано: ${count}`, text: 'Енот пересчитал лимит и огонёк.', pose: 'count' })
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Удалить операцию?"
        text={deleting ? `«${operationLabel(deleting.category, deleting.description)}» на ${formatRub(deleting.amount)}. Баланс счёта вернётся как было.` : ''}
        confirmLabel="Удалить"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          await api.deleteOperation(deleting.id)
          await dataChanged()
        }}
      />
    </div>
  )
}

const PIE_COLORS = ['#FFDD2D', '#1C1C1E', '#D9731C', '#1F9D57', '#5B8DEF', '#C62828']

/** Все траты из списка операций, без обрезки по периоду стипендии и без лимита категорий. */
function spendingByCategory(operations: Operation[]): [string, number][] {
  const sums = new Map<string, number>()
  for (const operation of operations) {
    if (operation.type !== 'expense' || operation.amount <= 0) continue
    sums.set(operation.category, (sums.get(operation.category) ?? 0) + operation.amount)
  }
  return [...sums.entries()].sort((a, b) => b[1] - a[1])
}

/** Круговая диаграмма трат по категориям. Секторы считаются долями окружности, чтобы круг сходился. */
function CategoryPie({ categories }: { categories: [string, number][] }) {
  const total = categories.reduce((sum, [, value]) => sum + value, 0)
  const radius = 24
  const circumference = 2 * Math.PI * radius
  let covered = 0
  const slices = categories.map(([category, value], index) => {
    const last = index === categories.length - 1
    const length = total <= 0 ? 0 : last ? circumference - covered : (value / total) * circumference
    const slice = {
      category,
      value,
      length,
      offset: covered,
      color: PIE_COLORS[index % PIE_COLORS.length],
    }
    covered += length
    return slice
  })

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <svg viewBox="0 0 100 100" className="h-40 w-40 shrink-0 -rotate-90" role="img" aria-label="Диаграмма трат по категориям">
        {slices.map((slice) => (
          <circle
            key={slice.category}
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={slice.color}
            strokeWidth="48"
            strokeDasharray={`${slice.length} ${circumference - slice.length}`}
            strokeDashoffset={-slice.offset}
          >
            <title>{`${categoryTitle(slice.category)}: ${formatRub(slice.value)}`}</title>
          </circle>
        ))}
      </svg>
      <ul className="flex max-h-64 w-full flex-col gap-1.5 overflow-y-auto">
        {slices.map((slice) => (
          <li key={slice.category} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: slice.color }} aria-hidden="true" />
            <span className="flex-1 text-ink">{categoryTitle(slice.category)}</span>
            <span className="font-semibold text-ink">{formatRub(slice.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const WASTE_TEXT: Record<string, (flag: Analytics['waste'][number]) => string> = {
  frequent: (flag) => `${flag.category}: ${flag.count} раз за неделю — ${formatRub(flag.sum)}`,
  small: (flag) => `Мелкие покупки до 300 ₽: ${flag.count} шт. за неделю — ${formatRub(flag.sum)}`,
  over_limit: (flag) => `Дней сверх лимита: ${flag.count} — перерасход ${formatRub(flag.sum)}`,
}

/** Куда уходят деньги в этом периоде (с последней стипендии) и что изменилось по сравнению с прошлым. */
function AnalyticsCard({ analytics, operations }: { analytics: Analytics; operations: Operation[] }) {
  const categories = spendingByCategory(operations)
  const { comparison, lasting } = analytics
  const topIncrease = comparison.increases[0]

  return (
    <Card className="flex flex-col gap-4 lg:sticky lg:top-8">
      <div className="flex items-start justify-between gap-2">
        <div>
          <TileLabel>Куда уходят деньги</TileLabel>
          <p className="text-sm text-muted">Все траты из списка</p>
        </div>
        <Raccoon pose="count" size={52} />
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-muted">Трат в этом периоде пока нет.</p>
      ) : (
        <CategoryPie categories={categories} />
      )}

      {comparison.has_previous && (
        <div className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
          <p className="text-ink">
            За {comparison.days_compared} {pluralDays(comparison.days_compared)}: {formatRub(comparison.current_total)} — в прошлый раз за
            те же дни {formatRub(comparison.previous_total)}.
          </p>
          {topIncrease && (
            <p className="text-muted">
              Больше всего выросло: {topIncrease.category} ({formatSignedRub(topIncrease.delta)})
            </p>
          )}
        </div>
      )}

      {analytics.waste.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-line pt-3">
          <span className="text-sm font-medium text-muted">Можно присмотреться</span>
          {analytics.waste.map((flag) => (
            <p key={`${flag.kind}-${flag.category}`} className="flex items-start gap-2 text-sm text-ink">
              <span className="mt-1.5">
                <StatusDot tone="warn" />
              </span>
              {(WASTE_TEXT[flag.kind] ?? (() => flag.category))(flag)}
            </p>
          ))}
        </div>
      )}

      {lasting.over_pace && (
        <p className="border-t border-line pt-3 text-sm text-ink">
          В среднем уходит {formatRub(lasting.average_per_day)} в день — больше лимита {formatRub(lasting.day_limit)}.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Link to="/chat?q=wasteful" className="inline-flex h-10 items-center rounded-full bg-chip px-4 text-sm font-medium text-ink">
          Где лишние траты?
        </Link>
        <Link to="/chat?q=faster" className="inline-flex h-10 items-center rounded-full bg-chip px-4 text-sm font-medium text-ink">
          Почему быстрее, чем в прошлый раз?
        </Link>
      </div>
    </Card>
  )
}
