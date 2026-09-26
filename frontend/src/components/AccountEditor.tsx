import { useState, type FormEvent } from 'react'
import { Button, Field, inputClass } from './ui'
import { parseAmount, roundMoney } from '../lib/format'
import { createId } from '../lib/storage'
import type { Account, AccountType } from '../types'

interface Props {
  /** Если счёт передан — редактируем его, иначе создаём новый. */
  account?: Account
  onSave: (account: Account) => void
  onCancel: () => void
}

export default function AccountEditor({ account, onSave, onCancel }: Props) {
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'card')
  const [balance, setBalance] = useState(account ? String(account.balance) : '')
  const [includeInSpending, setIncludeInSpending] = useState(account?.include_in_spending ?? true)
  const [error, setError] = useState<string | null>(null)

  function changeType(next: AccountType) {
    setType(next)
    // Для нового счёта: накопления по умолчанию не тратим.
    if (!account) setIncludeInSpending(next !== 'savings')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = balance.trim() === '' ? 0 : parseAmount(balance)

    if (!name.trim()) {
      setError('Введите название счёта')
      return
    }
    if (!Number.isFinite(value)) {
      setError('Введите баланс числом')
      return
    }

    onSave({
      id: account?.id ?? createId(),
      name: name.trim(),
      type,
      balance: roundMoney(value),
      include_in_spending: includeInSpending,
      created_at: account?.created_at ?? new Date().toISOString(),
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4">
      <p className="font-semibold">{account ? 'Изменить счёт' : 'Новый счёт'}</p>

      <Field label="Название">
        <input
          className={inputClass}
          maxLength={40}
          placeholder="Например, Карта стипендии"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Тип">
          <select
            className={inputClass}
            value={type}
            onChange={(event) => changeType(event.target.value as AccountType)}
          >
            <option value="card">Карта</option>
            <option value="cash">Наличные</option>
            <option value="savings">Накопления</option>
          </select>
        </Field>
        <Field label="Баланс, ₽">
          <input
            className={inputClass}
            inputMode="decimal"
            placeholder="0"
            value={balance}
            onChange={(event) => setBalance(event.target.value)}
          />
        </Field>
      </div>

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-teal-600"
          checked={includeInSpending}
          onChange={(event) => setIncludeInSpending(event.target.checked)}
        />
        Учитывать в деньгах на повседневные траты
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
