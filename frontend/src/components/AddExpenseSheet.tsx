import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import { categoriesFor, categoryIcon } from '../lib/categories'
import { addDaysISO, formatRub, parseAmount, pluralDays, todayISO } from '../lib/format'
import type { OperationType } from '../lib/types'
import { useApp } from '../state/AppContext'
import { Button, ErrorNote, Field, MoneyInput, Segmented, Select, Sheet, TextInput, Toggle } from './ui'

/** Окно «Добавить трату» — открывается жёлтой кнопкой «+» с любого экрана. */
export default function AddExpenseSheet() {
  const { expenseSheet, closeExpenseSheet, dashboard, dataChanged, showToast } = useApp()
  const accounts = (dashboard?.accounts ?? []).filter((account) => account.type !== 'savings')

  const [type, setType] = useState<OperationType>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Продукты')
  const [description, setDescription] = useState('')
  const [accountId, setAccountId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [mandatory, setMandatory] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Каждый раз при открытии — чистая форма (или подстановка с экрана «Покупка»).
  useEffect(() => {
    if (!expenseSheet.open) return
    const preset = expenseSheet.preset ?? {}
    setType(preset.type ?? 'expense')
    setAmount(preset.amount ? String(preset.amount) : '')
    setCategory(preset.category ?? (preset.type === 'income' ? 'Подработка' : 'Продукты'))
    setDescription(preset.description ?? '')
    setAccountId(preset.account_id ?? accounts[0]?.id ?? '')
    setDate(preset.date ?? todayISO())
    setMandatory(preset.is_mandatory ?? false)
    setError(null)
    // Счёт по умолчанию берём на момент открытия, поэтому следим только за open.
  }, [expenseSheet.open])

  const changeType = (value: OperationType) => {
    setType(value)
    setCategory(value === 'income' ? 'Подработка' : 'Продукты')
    setMandatory(false)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const value = parseAmount(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Введи сумму больше нуля.')
      return
    }

    setSaving(true)
    setError(null)
    const streakBefore = dashboard?.streak.current ?? 0
    try {
      await api.addOperation({
        type,
        amount: value,
        category,
        description: description.trim() || category,
        account_id: accountId || null,
        date,
        is_mandatory: type === 'expense' && mandatory,
      })
      closeExpenseSheet()
      const fresh = await dataChanged()
      showToast(savedMessage(type, mandatory, fresh?.budget.left_today, fresh?.streak.current ?? 0, streakBefore))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={expenseSheet.open} onClose={closeExpenseSheet} title={type === 'expense' ? 'Новая трата' : 'Новый доход'}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Segmented
          label="Тип операции"
          value={type}
          onChange={changeType}
          options={[
            { value: 'expense', label: 'Трата' },
            { value: 'income', label: 'Доход' },
          ]}
        />

        <Field label="Сумма">
          {(id) => <MoneyInput id={id} big autoFocus placeholder="0" value={amount} onChange={setAmount} />}
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted">Категория</span>
          <div className="flex flex-wrap gap-2">
            {categoriesFor(type).map((item) => {
              const Icon = categoryIcon(item)
              const active = item === category
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategory(item)}
                  className={`inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition ${active ? 'bg-ink text-page' : 'bg-card text-ink hover:bg-chip'}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item}
                </button>
              )
            })}
          </div>
        </div>

        <Field label="Описание" hint="Необязательно. Например: «Шаурма у общаги»">
          {(id) => <TextInput id={id} maxLength={80} value={description} onChange={(event) => setDescription(event.target.value)} />}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Счёт">
            {(id) => (
              <Select id={id} value={accountId} onChange={(event) => setAccountId(event.target.value)}>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Дата">
            {(id) => (
              <TextInput
                id={id}
                type="date"
                value={date}
                max={todayISO()}
                min={addDaysISO(todayISO(), -365)}
                onChange={(event) => setDate(event.target.value || todayISO())}
              />
            )}
          </Field>
        </div>

        {type === 'expense' && (
          <Toggle
            checked={mandatory}
            onChange={setMandatory}
            label="Обязательная трата"
            description="Общежитие, проезд, связь. Не уменьшает дневной лимит — идёт из плана обязательных трат."
          />
        )}

        {error && <ErrorNote>{error}</ErrorNote>}

        <Button type="submit" loading={saving} className="w-full">
          Сохранить
        </Button>
      </form>
    </Sheet>
  )
}

function savedMessage(type: OperationType, mandatory: boolean, leftToday: number | undefined, streak: number, streakBefore: number) {
  if (streak > streakBefore) {
    return { title: `Огонёк горит: ${streak} ${pluralDays(streak)} подряд!`, text: 'День засчитан — траты в пределах лимита.', pose: 'celebrate' as const }
  }
  if (type === 'income') {
    return { title: 'Доход записан', text: 'Енот пересчитал лимит до стипендии.', pose: 'celebrate' as const }
  }
  if (mandatory || leftToday === undefined) {
    return { title: 'Записано', text: 'Обязательная трата учтена в плане.', pose: 'calm' as const }
  }
  return leftToday >= 0
    ? { title: 'Записано', text: `Сегодня можно ещё ${formatRub(leftToday)}.`, pose: 'calm' as const }
    : { title: 'Сегодня вышли за лимит', text: `Перерасход ${formatRub(-leftToday)}. Завтра Енот пересчитает лимит.`, pose: 'worried' as const }
}
