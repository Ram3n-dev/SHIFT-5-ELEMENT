import { useState, type FormEvent } from 'react'
import { ShoppingBag } from 'lucide-react'
import { Button, Card, Field, Spinner, inputClass } from './ui'
import { parseAmount } from '../lib/format'

interface Props {
  disabled?: boolean
  onCheck: (name: string, amount: number) => Promise<void>
}

export default function PurchaseCheckForm({ disabled = false, onCheck }: Props) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = parseAmount(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Введите сумму покупки больше нуля')
      return
    }

    setError(null)
    setLoading(true)
    try {
      await onCheck(name.trim() || 'Покупка', value)
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : 'Не удалось проверить покупку.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field label="Что хотите купить">
          <input
            className={inputClass}
            maxLength={60}
            placeholder="Наушники"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="Сумма покупки, ₽">
          <input
            className={inputClass}
            inputMode="decimal"
            placeholder="650"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </Field>

        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={disabled || loading}>
          {loading ? <Spinner /> : <ShoppingBag className="size-5" aria-hidden="true" />}
          Проверить покупку
        </Button>
      </form>
    </Card>
  )
}
