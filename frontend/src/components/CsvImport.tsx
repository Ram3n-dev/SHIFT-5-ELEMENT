import { useRef, useState } from 'react'
import { CircleCheck, FileText, Lock, Upload, X } from 'lucide-react'
import { Button, Card, ErrorState, Field, Spinner, inputClass } from './ui'
import { MAX_FILE_SIZE_BYTES, parseCsv, readCsvFile, type CsvParseResult, type ParsedOperation } from '../lib/csvParser'
import { formatRub, formatSignedRub, roundMoney } from '../lib/format'
import { defaultAccountId } from '../state/BudgetContext'
import type { Account } from '../types'

type Step = 'select' | 'reading' | 'preview' | 'errors' | 'done'

interface Props {
  accounts: Account[]
  onImport: (operations: ParsedOperation[], accountId: string) => void
  onClose: () => void
  onDone?: () => void
}

const MAX_SHOWN_ERRORS = 8

function fileError(message: string): CsvParseResult {
  return { operations: [], errors: [{ line: 0, message }], unknownCategoryCount: 0 }
}

/** Импорт учебной CSV-выписки. Файл читается и разбирается прямо в браузере. */
export default function CsvImport({ accounts, onImport, onClose, onDone }: Props) {
  const [step, setStep] = useState<Step>('select')
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<CsvParseResult | null>(null)
  const [accountId, setAccountId] = useState(() => defaultAccountId(accounts))
  const [importedCount, setImportedCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setFileName(file.name)

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setResult(fileError('Файл больше 1 МБ. Для учебной выписки нужен файл поменьше.'))
      setStep('errors')
      return
    }

    setStep('reading')
    try {
      const parsed = parseCsv(await readCsvFile(file))
      setResult(parsed)
      setStep(parsed.errors.length > 0 ? 'errors' : 'preview')
    } catch {
      setResult(fileError('Не удалось прочитать файл.'))
      setStep('errors')
    }
  }

  function chooseAnotherFile() {
    setStep('select')
    setResult(null)
    setFileName('')
    if (inputRef.current) inputRef.current.value = ''
  }

  function confirmImport() {
    if (!result || !accounts.some((account) => account.id === accountId)) return
    onImport(result.operations, accountId)
    setImportedCount(result.operations.length)
    setStep('done')
    onDone?.()
  }

  const operations = result?.operations ?? []
  const incomeCount = operations.filter((operation) => operation.type === 'income').length
  const balanceChange = roundMoney(
    operations.reduce((sum, operation) => sum + (operation.type === 'income' ? operation.amount : -operation.amount), 0),
  )
  const accountName = accounts.find((account) => account.id === accountId)?.name ?? 'счёт'

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <FileText className="size-5 text-teal-600" aria-hidden="true" />
          Импорт учебной выписки
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть импорт"
          className="cursor-pointer rounded-xl p-2 text-slate-500 hover:bg-slate-100"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <p className="mt-3 flex gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Загружайте только учебные или обезличенные данные. В MVP выписка обрабатывается в браузере и не отправляется на
        сервер.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        tabIndex={-1}
        className="sr-only"
        aria-label="CSV-файл выписки"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      {step === 'select' && (
        <div className="mt-4 space-y-4">
          <Button className="w-full" onClick={() => inputRef.current?.click()}>
            <Upload className="size-5" aria-hidden="true" />
            Выбрать CSV-файл
          </Button>
          <div className="text-sm text-slate-600">
            <p className="font-medium text-slate-700">Формат файла</p>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
              {'date,description,amount,category\n2026-09-25,Стипендия,2500,Стипендия\n2026-09-26,Продукты,-450,Еда\n2026-09-26,Проезд,-70,Транспорт'}
            </pre>
            <p className="mt-2 text-xs text-slate-500">
              Сумма больше нуля — доход, меньше нуля — расход. Готовые примеры лежат в папке demo-data.
            </p>
          </div>
        </div>
      )}

      {step === 'reading' && (
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-600">
          <Spinner className="size-4" />
          Читаем «{fileName}»…
        </p>
      )}

      {step === 'errors' && result && (
        <div className="mt-4 space-y-3">
          <ErrorState message={`В файле «${fileName}» есть ошибки — ничего не импортировано. Исправьте их и загрузите файл снова.`}>
            <Button variant="secondary" size="sm" onClick={chooseAnotherFile}>
              Выбрать другой файл
            </Button>
          </ErrorState>
          <ul className="space-y-1 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
            {result.errors.slice(0, MAX_SHOWN_ERRORS).map((error, index) => (
              <li key={index}>
                {error.line > 0 && <span className="font-semibold">Строка {error.line}: </span>}
                {error.message}
              </li>
            ))}
            {result.errors.length > MAX_SHOWN_ERRORS && (
              <li className="text-slate-500">…и ещё {result.errors.length - MAX_SHOWN_ERRORS}</li>
            )}
          </ul>
        </div>
      )}

      {step === 'preview' && result && (
        <div className="mt-4 space-y-4">
          <dl className="divide-y divide-slate-100 rounded-2xl bg-slate-50 px-4 text-sm">
            <div className="flex justify-between gap-3 py-2.5">
              <dt className="text-slate-600">Файл</dt>
              <dd className="truncate font-medium">{fileName}</dd>
            </div>
            <div className="flex justify-between gap-3 py-2.5">
              <dt className="text-slate-600">Операций</dt>
              <dd className="font-medium">
                {operations.length} (доходов: {incomeCount}, расходов: {operations.length - incomeCount})
              </dd>
            </div>
            <div className="flex justify-between gap-3 py-2.5">
              <dt className="text-slate-600">Изменение баланса</dt>
              <dd className="font-semibold tabular-nums">{formatSignedRub(balanceChange)}</dd>
            </div>
          </dl>

          {result.unknownCategoryCount > 0 && (
            <p className="text-xs text-slate-500">
              Операций с незнакомой категорией: {result.unknownCategoryCount}. Они попадут в категорию «Другое».
            </p>
          )}

          <Field label="На какой счёт импортировать">
            <select className={inputClass} value={accountId} onChange={(event) => setAccountId(event.target.value)}>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({formatRub(account.balance)})
                </option>
              ))}
            </select>
          </Field>
          <p className="text-xs text-slate-500">
            Баланс счёта «{accountName}» изменится на {formatSignedRub(balanceChange)}, и лимит пересчитается.
          </p>

          <div className="grid gap-2">
            <Button onClick={confirmImport} disabled={accounts.length === 0}>
              Импортировать
            </Button>
            <Button variant="secondary" onClick={chooseAnotherFile}>
              Отмена
            </Button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="mt-4 space-y-3">
          <p role="status" className="flex gap-2 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">
            <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Импортировано операций: {importedCount}. Они появились в истории ниже.
          </p>
          <Button variant="secondary" className="w-full" onClick={chooseAnotherFile}>
            Загрузить ещё файл
          </Button>
        </div>
      )}
    </Card>
  )
}
