import { useState } from 'react'
import { api } from '../lib/api'
import { categoryTitle } from '../lib/categories'
import { formatRub } from '../lib/format'
import type { Account, BankImportResult, SafeBankOperation } from '../lib/types'
import { Button, ErrorNote, Field, Select, Sheet } from './ui'

interface BankImportProps {
  open: boolean
  accounts: Account[]
  onClose: () => void
  onImported: (count: number) => void
}

/**
 * Загрузка учебной выписки из песочницы банка.
 * На экран приходят только обезличенные операции: счёт, ИНН и ФИО сюда не попадают.
 */
export default function BankImport({ open, accounts, onClose, onImported }: BankImportProps) {
  const [accountId, setAccountId] = useState('')
  const [result, setResult] = useState<BankImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const selectedAccount = accountId || accounts[0]?.id || ''
  const expenses = result?.operations.filter((operation) => operation.type !== 'income') ?? []
  const incomes = result?.operations.filter((operation) => operation.type === 'income') ?? []

  const close = () => {
    setResult(null)
    setError(null)
    onClose()
  }

  const load = async () => {
    if (!selectedAccount) return
    setSaving(true)
    setError(null)
    try {
      const value = await api.importBankStatement(selectedAccount)
      setResult(value)
      if (value.imported > 0) onImported(value.imported)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось получить выписку.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onClose={close} title="Выписка из банка">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Берём учебную выписку из песочницы T-Bank. На экране остаются категория и сумма: расходы и доходы.
        </p>
        {accounts.length === 0 ? (
          <ErrorNote>Сначала добавь счёт в профиле — операции нужно к нему привязать.</ErrorNote>
        ) : (
          <Field label="Куда записать">
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
        )}
        {error && <ErrorNote>{error}</ErrorNote>}
        {result && (
          <div className="flex max-h-64 flex-col gap-3 overflow-y-auto">
            <OperationGroup title="Расходы" operations={expenses} />
            <OperationGroup title="Доходы" operations={incomes} />
          </div>
        )}
        <Button onClick={load} loading={saving} disabled={!selectedAccount}>
          Получить выписку
        </Button>
      </div>
    </Sheet>
  )
}

const ONE_WORD: Record<string, string> = {
  'Кафе и доставка': 'кафе',
}

function statementWord(category: string): string {
  const titled = categoryTitle(category)
  if (titled !== category) return titled.toLocaleLowerCase('ru-RU')
  const known = ONE_WORD[titled]
  if (known) return known
  const word = titled.trim().split(/\s+/)[0] || 'другое'
  return word.charAt(0).toLocaleLowerCase('ru-RU') + word.slice(1)
}

function OperationGroup({ title, operations }: { title: string; operations: SafeBankOperation[] }) {
  if (operations.length === 0) return null
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <ul className="flex flex-col gap-2">
        {operations.map((operation) => (
          <li key={operation.id} className="flex justify-between gap-3 rounded-2xl bg-chip px-3 py-2 text-sm">
            <span className="text-ink">{statementWord(operation.category)}</span>
            <span className="font-semibold text-ink">{formatRub(operation.amount)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
