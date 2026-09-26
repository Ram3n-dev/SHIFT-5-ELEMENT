import { useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Upload } from 'lucide-react'
import CsvImport from '../components/CsvImport'
import OperationsList from '../components/OperationsList'
import QuickOperationForm from '../components/QuickOperationForm'
import { Button, EmptyState } from '../components/ui'
import { formatRub } from '../lib/format'
import { useBudget } from '../state/BudgetContext'

export default function OperationsPage() {
  const { state, calculation, addOperation, importOperations } = useBudget()
  const [searchParams, setSearchParams] = useSearchParams()
  const historyRef = useRef<HTMLDivElement>(null)
  const importOpen = searchParams.get('import') === '1'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-bold">Операции</h1>
        {calculation && (
          <p className="text-sm text-slate-600">
            Лимит: <span className="font-semibold text-slate-900">{formatRub(calculation.daily_limit)}</span> в день
          </p>
        )}
      </div>

      {state.accounts.length === 0 ? (
        <EmptyState title="Нет ни одного счёта" text="Добавьте счёт в настройках, чтобы записывать операции." />
      ) : (
        <QuickOperationForm accounts={state.accounts} onSubmit={addOperation} />
      )}

      {importOpen ? (
        <CsvImport
          accounts={state.accounts}
          onImport={importOperations}
          onClose={() => setSearchParams({})}
          onDone={() => historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        />
      ) : (
        <Button variant="secondary" className="w-full" onClick={() => setSearchParams({ import: '1' })}>
          <Upload className="size-5" aria-hidden="true" />
          Импорт учебной выписки
        </Button>
      )}

      <div ref={historyRef} className="scroll-mt-20">
        <OperationsList operations={state.operations} accounts={state.accounts} />
      </div>
    </div>
  )
}
