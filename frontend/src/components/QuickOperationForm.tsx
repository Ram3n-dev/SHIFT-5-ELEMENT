import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Button, Card, Field, inputClass } from './ui'
import { EXPENSE_CATEGORIES, categoriesFor } from '../lib/categories'
import { formatRub, isValidISODate, parseAmount, todayISO } from '../lib/format'
import { defaultAccountId, type NewOperation } from '../state/BudgetContext'
import type { Account, OperationType } from '../types'

interface Props {
  accounts: Account[]
  onSubmit: (operation: NewOperation) => void
}

/** Быстрое ручное добавление расхода или дохода. */
export default function QuickOperationForm({ accounts, onSubmit }: Props) {
  const [type, setType] = useState<OperationType>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [accountId, setAccountId] = useState(() => defaultAccountId(accounts))
  const [date, setDate] = useState(todayISO)
  const [isMandatory, setIsMandatory] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  function switchType(next: OperationType) {
    setType(next)
    setCategory(categoriesFor(next)[0])
    setIsMandatory(false)
    setSavedMessage(null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = parseAmount(amount)

    if (!Number.isFinite(value) || value <= 0) {
      setError('Введите сумму больше нуля')
      return
    }
    if (!accounts.some((account) => account.id === accountId)) {
      setError('Выберите счёт')
      return
    }
    if (!isValidISODate(date)) {
      setError('Укажите дату')
      return
    }

    onSubmit({
      type,
      amount: value,
      category,
      description: description.trim(),
      account_id: accountId,
      date,
      is_mandatory: type === 'expense' && isMandatory,
    })

    setSavedMessage(`${type === 'expense' ? 'Расход' : 'Доход'} ${formatRub(value)} добавлен, лимит пересчитан.`)
    setAmount('')
    setDescription('')
    setIsMandatory(false)
    setError(null)
  }

  return (
    <Card>
      <h2 className="text-base font-semibold">Быстрое добавление</h2>
      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
        <div role="radiogroup" aria-label="Тип операции" className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
          {(['expense', 'income'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={type === value}
              onClick={() => switchType(value)}
              className={`cursor-pointer rounded-xl py-2 text-sm font-semibold transition ${
                type === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {value === 'expense' ? 'Расход' : 'Доход'}
            </button>
          ))}
        </div>

        <Field label="Сумма, ₽">
          <input
            className={inputClass}
            inputMode="decimal"
            placeholder="180"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Категория">
            <select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)}>
              {categoriesFor(type).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Счёт">
            <select className={inputClass} value={accountId} onChange={(event) => setAccountId(event.target.value)}>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Описание">
          <input
            className={inputClass}
            maxLength={60}
            placeholder={type === 'expense' ? 'Например, кофе' : 'Например, стипендия'}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>

        <Field label="Дата">
          <input type="date" className={inputClass} value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>

        {type === 'expense' && (
          <label className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-teal-600"
              checked={isMandatory}
              onChange={(event) => setIsMandatory(event.target.checked)}
            />
            <span>
              <span className="font-medium">Это обязательная трата</span>
              <span className="block text-xs text-slate-500">
                Например, оплата общежития. Сумма уменьшит запланированные обязательные траты.
              </span>
            </span>
          </label>
        )}

        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        )}
        {savedMessage && !error && (
          <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {savedMessage}
          </p>
        )}

        <Button type="submit" className="w-full">
          <Plus className="size-5" aria-hidden="true" />
          {type === 'expense' ? 'Добавить расход' : 'Добавить доход'}
        </Button>
      </form>
    </Card>
  )
}
