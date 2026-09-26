import { useState, type ChangeEvent } from 'react'
import { FileUp } from 'lucide-react'
import { api } from '../lib/api'
import { MAX_FILE_SIZE_BYTES, parseCsv, readCsvFile, REQUIRED_COLUMNS, type CsvParseResult } from '../lib/csvParser'
import { formatRub } from '../lib/format'
import type { Account } from '../lib/types'
import { Button, ErrorNote, Field, Select, Sheet, Toggle } from './ui'

interface CsvImportProps {
  open: boolean
  accounts: Account[]
  onClose: () => void
  onImported: (count: number) => void
}

/** Импорт учебной выписки CSV. Файл разбирается в браузере, на сервер уходят только готовые операции. */
export default function CsvImport({ open, accounts, onClose, onImported }: CsvImportProps) {
  const [accountId, setAccountId] = useState('')
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<CsvParseResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // Выписка — прошлое: баланс, указанный в онбординге, обычно уже учитывает эти траты.
  const [balanceIncludes, setBalanceIncludes] = useState(true)

  const selectedAccount = accountId || accounts[0]?.id || ''

  const close = () => {
    setParsed(null)
    setFileName('')
    setError(null)
    onClose()
  }

  const pickFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    setParsed(null)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError('Файл больше 1 МБ. Разбей выписку на части.')
      return
    }
    setFileName(file.name)
    setParsed(parseCsv(await readCsvFile(file)))
  }

  const importAll = async () => {
    if (!parsed || parsed.operations.length === 0 || !selectedAccount) return
    setSaving(true)
    setError(null)
    try {
      await api.importOperations(
        selectedAccount,
        parsed.operations.map((operation) => ({
          type: operation.type,
          amount: operation.amount,
          category: operation.category,
          description: operation.description,
          account_id: selectedAccount,
          date: operation.date,
          is_mandatory: false,
        })),
        balanceIncludes,
      )
      onImported(parsed.operations.length)
      close()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось импортировать.')
    } finally {
      setSaving(false)
    }
  }

  const expenses = parsed?.operations.filter((operation) => operation.type === 'expense') ?? []
  const incomes = parsed?.operations.filter((operation) => operation.type === 'income') ?? []

  return (
    <Sheet open={open} onClose={close} title="Импорт выписки CSV">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Только учебные данные. Первая строка файла: <code className="rounded bg-chip px-1">{REQUIRED_COLUMNS.join(',')}</code>. Сумма
          со знаком минус — трата, без минуса — доход. Примеры лежат в папке demo-data.
        </p>

        <Field label="На какой счёт">
          {(id) => (
            <Select id={id} value={selectedAccount} onChange={(event) => setAccountId(event.target.value)}>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-card px-4 py-6 font-semibold text-ink transition hover:bg-chip">
          <FileUp className="h-5 w-5" aria-hidden="true" />
          {fileName || 'Выбрать файл .csv'}
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={pickFile} />
        </label>

        {parsed && (
          <div className="flex flex-col gap-2 rounded-2xl bg-card p-4 text-sm">
            <p className="text-ink">
              Найдено операций: <b>{parsed.operations.length}</b> — трат {expenses.length} на{' '}
              {formatRub(expenses.reduce((sum, item) => sum + item.amount, 0))}, доходов {incomes.length}.
            </p>
            {parsed.unknownCategoryCount > 0 && (
              <p className="text-muted">Неизвестных категорий: {parsed.unknownCategoryCount} — отнесём к «Другое».</p>
            )}
            {parsed.errors.length > 0 && (
              <div className="text-muted">
                <p>Строки с ошибками пропустим:</p>
                <ul className="mt-1 list-disc pl-5">
                  {parsed.errors.slice(0, 5).map((item) => (
                    <li key={`${item.line}-${item.message}`}>{item.line > 0 ? `строка ${item.line}: ${item.message}` : item.message}</li>
                  ))}
                  {parsed.errors.length > 5 && <li>и ещё {parsed.errors.length - 5}</li>}
                </ul>
              </div>
            )}
          </div>
        )}

        <Toggle
          checked={balanceIncludes}
          onChange={setBalanceIncludes}
          label="Баланс счёта уже учитывает эти операции"
          description="Включено — выписка нужна для анализа трат и кэшбэка, баланс не изменится. Выключено — суммы спишутся и зачислятся на счёт."
        />

        {error && <ErrorNote>{error}</ErrorNote>}

        <Button onClick={importAll} loading={saving} disabled={!parsed || parsed.operations.length === 0 || !selectedAccount}>
          Импортировать
        </Button>
      </div>
    </Sheet>
  )
}
