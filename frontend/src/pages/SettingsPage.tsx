import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import AccountEditor from '../components/AccountEditor'
import AccountList from '../components/AccountList'
import ConfirmDialog from '../components/ConfirmDialog'
import RecurringExpenseEditor from '../components/RecurringExpenseEditor'
import RecurringExpensesList from '../components/RecurringExpensesList'
import { Button, Card, Field, IconButton, inputClass } from '../components/ui'
import { isValidISODate, parseAmount, todayISO } from '../lib/format'
import { useBudget, type SettingsPatch } from '../state/BudgetContext'
import type { Account, BudgetSettings, RecurringExpense } from '../types'

type PendingAction =
  | { kind: 'delete-account'; account: Account }
  | { kind: 'delete-recurring'; item: RecurringExpense }
  | { kind: 'reset' }

function dialogTexts(action: PendingAction): { title: string; text: string; confirmLabel: string } {
  switch (action.kind) {
    case 'delete-account':
      return {
        title: 'Удалить счёт?',
        text: `Счёт «${action.account.name}» больше не будет учитываться в расчёте. Операции по нему останутся в истории.`,
        confirmLabel: 'Удалить',
      }
    case 'delete-recurring':
      return {
        title: 'Удалить регулярный платёж?',
        text: `«${action.item.name}» больше не будет учитываться в обязательных тратах.`,
        confirmLabel: 'Удалить',
      }
    case 'reset':
      return {
        title: 'Удалить все данные?',
        text: 'Счета, операции, регулярные траты и настройки будут удалены из этого браузера. Отменить это нельзя.',
        confirmLabel: 'Удалить данные',
      }
  }
}

export default function SettingsPage() {
  const { state, updateSettings, saveAccount, deleteAccount, saveRecurring, deleteRecurring, resetAll } = useBudget()
  const navigate = useNavigate()
  const [editingAccount, setEditingAccount] = useState<Account | 'new' | null>(null)
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | 'new' | null>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)

  if (!state.settings) return null

  function confirmPending() {
    if (!pending) return
    if (pending.kind === 'delete-account') deleteAccount(pending.account.id)
    if (pending.kind === 'delete-recurring') deleteRecurring(pending.item.id)
    if (pending.kind === 'reset') {
      resetAll()
      navigate('/', { replace: true })
    }
    setPending(null)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Настройки</h1>

      <BudgetSettingsForm settings={state.settings} onSave={updateSettings} />

      <AccountList
        accounts={state.accounts}
        renderActions={(account) => (
          <span className="flex">
            <IconButton label={`Изменить счёт «${account.name}»`} onClick={() => setEditingAccount(account)}>
              <Pencil className="size-4" aria-hidden="true" />
            </IconButton>
            <IconButton
              label={`Удалить счёт «${account.name}»`}
              onClick={() => setPending({ kind: 'delete-account', account })}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </IconButton>
          </span>
        )}
      >
        {editingAccount ? (
          <AccountEditor
            key={editingAccount === 'new' ? 'new' : editingAccount.id}
            account={editingAccount === 'new' ? undefined : editingAccount}
            onSave={(account) => {
              saveAccount(account)
              setEditingAccount(null)
            }}
            onCancel={() => setEditingAccount(null)}
          />
        ) : (
          <Button variant="ghost" className="mt-2 w-full" onClick={() => setEditingAccount('new')}>
            <Plus className="size-5" aria-hidden="true" />
            Добавить счёт
          </Button>
        )}
      </AccountList>

      <RecurringExpensesList
        title="Регулярные траты"
        items={state.recurring_expenses}
        emptyText="Например, общежитие, интернет или подписка. Платежи до стипендии попадут в обязательные траты."
        renderActions={(listItem) => {
          const item = state.recurring_expenses.find((expense) => expense.id === listItem.id)
          if (!item) return null
          return (
            <span className="flex">
              <IconButton label={`Изменить «${item.name}»`} onClick={() => setEditingRecurring(item)}>
                <Pencil className="size-4" aria-hidden="true" />
              </IconButton>
              <IconButton label={`Удалить «${item.name}»`} onClick={() => setPending({ kind: 'delete-recurring', item })}>
                <Trash2 className="size-4" aria-hidden="true" />
              </IconButton>
            </span>
          )
        }}
      >
        {editingRecurring ? (
          <RecurringExpenseEditor
            key={editingRecurring === 'new' ? 'new' : editingRecurring.id}
            item={editingRecurring === 'new' ? undefined : editingRecurring}
            onSave={(item) => {
              saveRecurring(item)
              setEditingRecurring(null)
            }}
            onCancel={() => setEditingRecurring(null)}
          />
        ) : (
          <Button variant="ghost" className="mt-2 w-full" onClick={() => setEditingRecurring('new')}>
            <Plus className="size-5" aria-hidden="true" />
            Добавить регулярную трату
          </Button>
        )}
      </RecurringExpensesList>

      <Card>
        <h2 className="text-base font-semibold">Мои данные</h2>
        <p className="mt-1 text-sm text-slate-600">
          Все данные хранятся только в этом браузере. Удаление сотрёт счета, операции и настройки.
        </p>
        <Button variant="danger" className="mt-4 w-full" onClick={() => setPending({ kind: 'reset' })}>
          <Trash2 className="size-5" aria-hidden="true" />
          Удалить мои данные
        </Button>
      </Card>

      {pending && (
        <ConfirmDialog
          open
          {...dialogTexts(pending)}
          onConfirm={confirmPending}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  )
}

interface BudgetSettingsFormProps {
  settings: BudgetSettings
  onSave: (patch: SettingsPatch) => void
}

function BudgetSettingsForm({ settings, onSave }: BudgetSettingsFormProps) {
  const [stipendDate, setStipendDate] = useState(settings.stipend_date)
  const [mandatory, setMandatory] = useState(String(settings.manual_mandatory_expenses))
  const [reserve, setReserve] = useState(String(settings.reserve))
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaved(false)
    const mandatoryValue = mandatory.trim() === '' ? 0 : parseAmount(mandatory)
    const reserveValue = reserve.trim() === '' ? 0 : parseAmount(reserve)

    if (!isValidISODate(stipendDate) || stipendDate <= todayISO()) {
      setError('Дата стипендии должна быть позже сегодняшнего дня')
      return
    }
    if (!Number.isFinite(mandatoryValue) || mandatoryValue < 0 || !Number.isFinite(reserveValue) || reserveValue < 0) {
      setError('Суммы должны быть от 0 ₽')
      return
    }

    onSave({ stipend_date: stipendDate, manual_mandatory_expenses: mandatoryValue, reserve: reserveValue })
    setError(null)
    setSaved(true)
  }

  return (
    <Card>
      <h2 className="text-base font-semibold">Бюджет до стипендии</h2>
      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
        <Field label="Дата следующей стипендии">
          <input
            type="date"
            className={inputClass}
            value={stipendDate}
            onChange={(event) => setStipendDate(event.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
          <Field label="Обязательные траты, ₽" hint="Кроме регулярных трат ниже">
            <input
              className={inputClass}
              inputMode="decimal"
              value={mandatory}
              onChange={(event) => setMandatory(event.target.value)}
            />
          </Field>
          <Field label="Резерв, ₽">
            <input
              className={inputClass}
              inputMode="decimal"
              value={reserve}
              onChange={(event) => setReserve(event.target.value)}
            />
          </Field>
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        )}
        {saved && !error && (
          <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Сохранено. Лимит пересчитан.
          </p>
        )}

        <Button type="submit" className="w-full">
          Сохранить
        </Button>
      </form>
    </Card>
  )
}
