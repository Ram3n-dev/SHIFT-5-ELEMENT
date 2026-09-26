import { useState, type FormEvent } from 'react'
import { Button, Field, inputClass } from './ui'
import { EXPENSE_CATEGORIES } from '../lib/categories'
import { addDaysISO, isValidISODate, parseAmount, roundMoney, todayISO } from '../lib/format'
import { createId } from '../lib/storage'
import type { RecurringExpense } from '../types'

interface Props {
  /** Если платёж передан — редактируем его, иначе создаём новый. */
  item?: RecurringExpense
  onSave: (item: RecurringExpense) => void
  onCancel: () => void
}

export default function RecurringExpenseEditor({ item, onSave, onCancel }: Props) {
  const [name, setName] = useState(item?.name ?? '')
  const [amount, setAmount] = useState(item ? String(item.amount) : '')
  const [category, setCategory] = useState(item?.category ?? 'Связь')
  const [nextDate, setNextDate] = useState(item?.next_date ?? addDaysISO(todayISO(), 1))
  const [enabled, setEnabled] = useState(item?.enabled ?? true)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = parseAmount(amount)

    if (!name.trim()) {
      setError('Введите название платежа')
      return
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError('Введите сумму больше нуля')
      return
    }
    if (!isValidISODate(nextDate)) {
      setError('Укажите дату следующего платежа')
      return
    }

    onSave({
      id: item?.id ?? createId(),
      name: name.trim(),
      amount: roundMoney(value),
      category,
      next_date: nextDate,
      frequency: 'monthly',
      enabled,
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4">
      <p className="font-semibold">{item ? 'Изменить платёж' : 'Новый регулярный платёж'}</p>

      <Field label="Название">
        <input
          className={inputClass}
          maxLength={60}
          placeholder="Например, Интернет"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Сумма, ₽">
          <input
            className={inputClass}
            inputMode="decimal"
            placeholder="300"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </Field>
        <Field label="Категория">
          <select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)}>
            {EXPENSE_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Дата следующего платежа" hint="Повторяется каждый месяц">
        <input type="date" className={inputClass} value={nextDate} onChange={(event) => setNextDate(event.target.value)} />
      </Field>

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-teal-600"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Учитывать в обязательных тратах
      </label>

      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit">Сохранить</Button>
      </div>
    </form>
  )
}
