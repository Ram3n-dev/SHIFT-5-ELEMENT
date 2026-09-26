import { useState, type FormEvent } from 'react'
import { Button, Field, inputClass } from './ui'
import type { OnboardingInput } from '../state/BudgetContext'
import { addDaysISO, isValidISODate, parseAmount, todayISO } from '../lib/format'

type MoneyField = 'card' | 'cash' | 'savings' | 'manual_mandatory_expenses' | 'reserve'
type FormValues = Record<MoneyField | 'stipend_date', string>
type FormErrors = Partial<Record<keyof FormValues, string>>

const MONEY_FIELDS: MoneyField[] = ['card', 'cash', 'savings', 'manual_mandatory_expenses', 'reserve']

const EMPTY_VALUES: FormValues = {
  card: '',
  cash: '',
  savings: '',
  stipend_date: '',
  manual_mandatory_expenses: '',
  reserve: '',
}

/** Данные из демо-сценария: 4 200 + 800 ₽, стипендия через 10 дней → 340 ₽ в день. */
function demoValues(): FormValues {
  return {
    card: '4200',
    cash: '800',
    savings: '0',
    stipend_date: addDaysISO(todayISO(), 10),
    manual_mandatory_expenses: '1200',
    reserve: '400',
  }
}

export default function BudgetSetupForm({ onSubmit }: { onSubmit: (input: OnboardingInput) => void }) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES)
  const [errors, setErrors] = useState<FormErrors>({})

  function update(field: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors: FormErrors = {}
    const money = {} as Record<MoneyField, number>
    for (const field of MONEY_FIELDS) {
      // Пустое поле считаем нулём.
      const amount = values[field].trim() === '' ? 0 : parseAmount(values[field])
      if (!Number.isFinite(amount) || amount < 0) nextErrors[field] = 'Введите сумму от 0 ₽'
      money[field] = amount
    }

    if (!isValidISODate(values.stipend_date)) {
      nextErrors.stipend_date = 'Выберите дату следующей стипендии'
    } else if (values.stipend_date <= todayISO()) {
      nextErrors.stipend_date = 'Дата стипендии должна быть позже сегодняшнего дня'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmit({ ...money, stipend_date: values.stipend_date })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <h2 className="whitespace-nowrap text-base font-semibold">Ваши деньги сейчас</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setValues(demoValues())
            setErrors({})
          }}
        >
          Заполнить демо-данными
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="На карте, ₽" error={errors.card}>
          <input
            className={inputClass}
            inputMode="decimal"
            placeholder="4 200"
            value={values.card}
            onChange={(event) => update('card', event.target.value)}
          />
        </Field>
        <Field label="Наличные, ₽" error={errors.cash}>
          <input
            className={inputClass}
            inputMode="decimal"
            placeholder="800"
            value={values.cash}
            onChange={(event) => update('cash', event.target.value)}
          />
        </Field>
      </div>

      <Field label="Накопления, ₽" hint="Не входят в повседневные траты — их можно включить позже" error={errors.savings}>
        <input
          className={inputClass}
          inputMode="decimal"
          placeholder="0"
          value={values.savings}
          onChange={(event) => update('savings', event.target.value)}
        />
      </Field>

      <Field label="Дата следующей стипендии" error={errors.stipend_date}>
        <input
          type="date"
          className={inputClass}
          min={addDaysISO(todayISO(), 1)}
          value={values.stipend_date}
          onChange={(event) => update('stipend_date', event.target.value)}
        />
      </Field>

      <Field
        label="Обязательные траты до стипендии, ₽"
        hint="То, что точно придётся оплатить: общежитие, связь, проезд"
        error={errors.manual_mandatory_expenses}
      >
        <input
          className={inputClass}
          inputMode="decimal"
          placeholder="1 200"
          value={values.manual_mandatory_expenses}
          onChange={(event) => update('manual_mandatory_expenses', event.target.value)}
        />
      </Field>

      <Field label="Резерв, ₽" hint="Сумма, которую вы не хотите тратить до стипендии" error={errors.reserve}>
        <input
          className={inputClass}
          inputMode="decimal"
          placeholder="400"
          value={values.reserve}
          onChange={(event) => update('reserve', event.target.value)}
        />
      </Field>

      <Button type="submit" className="w-full">
        Рассчитать мой лимит
      </Button>
      <p className="text-center text-xs text-slate-500">Расчёт является ориентиром, а не финансовой рекомендацией.</p>
    </form>
  )
}
