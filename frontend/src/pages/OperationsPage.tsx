import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileUp, Plus } from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'
import CsvImport from '../components/CsvImport'
import OperationsList from '../components/OperationsList'
import Raccoon from '../components/Raccoon'
import { Button, Card, Chip, ErrorNote, PageTitle, Spinner, StatusDot, TileLabel } from '../components/ui'
import { api } from '../lib/api'
import { formatRub, formatSignedRub, pluralDays } from '../lib/format'
import type { Analytics, Operation } from '../lib/types'
import { useApp } from '../state/AppContext'

type Filter = 'all' | 'expense' | 'income'

export default function OperationsPage() {
  const { version, dataChanged, openExpenseSheet, dashboard, showToast } = useApp()
  const [operations, setOperations] = useState<Operation[] | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [importOpen, setImportOpen] = useState(false)
  const [deleting, setDeleting] = useState<Operation | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([api.operations(), api.analytics()])
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

  return (
    <div>
      <PageTitle
        title="Операции"
        subtitle="Последние 90 дней"
        action={
          <div className="flex gap-2">
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
            <div className="flex gap-2">
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

          {analytics && <AnalyticsCard analytics={analytics} />}
        </div>
      )}

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
        text={deleting ? `«${deleting.description}» на ${formatRub(deleting.amount)}. Баланс счёта вернётся как было.` : ''}
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

const WASTE_TEXT: Record<string, (flag: Analytics['waste'][number]) => string> = {
  frequent: (flag) => `${flag.category}: ${flag.count} раз за неделю — ${formatRub(flag.sum)}`,
  small: (flag) => `Мелкие покупки до 300 ₽: ${flag.count} шт. за неделю — ${formatRub(flag.sum)}`,
  over_limit: (flag) => `Дней сверх лимита: ${flag.count} — перерасход ${formatRub(flag.sum)}`,
}

/** Куда уходят деньги в этом периоде (с последней стипендии) и что изменилось по сравнению с прошлым. */
function AnalyticsCard({ analytics }: { analytics: Analytics }) {
  const categories = Object.entries(analytics.by_category)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
  const max = categories[0]?.[1] ?? 0
  const { comparison, lasting } = analytics
  const topIncrease = comparison.increases[0]

  return (
    <Card className="flex flex-col gap-4 lg:sticky lg:top-8">
      <div className="flex items-start justify-between gap-2">
        <div>
          <TileLabel>Куда уходят деньги</TileLabel>
          <p className="text-sm text-muted">С последней стипендии, без обязательных трат</p>
        </div>
        <Raccoon pose="count" size={52} />
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-muted">Трат в этом периоде пока нет.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {categories.map(([category, sum]) => (
            <li key={category} className="flex flex-col gap-1">
              <span className="flex justify-between text-sm">
                <span className="text-ink">{category}</span>
                <span className="font-semibold text-ink">{formatRub(sum)}</span>
              </span>
              <span className="h-1.5 overflow-hidden rounded-full bg-chip" aria-hidden="true">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${max > 0 ? (sum / max) * 100 : 0}%` }} />
              </span>
            </li>
          ))}
        </ul>
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
