import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import Raccoon from '../components/Raccoon'
import { Button, Card, ErrorNote, Field, MoneyInput, PageTitle, Spinner, StatusDot, TextInput, TileLabel } from '../components/ui'
import { api } from '../lib/api'
import { formatRub, formatSignedRub, parseAmount, roundMoney } from '../lib/format'
import type { PurchaseDecision, PurchaseResult, RaccoonPose } from '../lib/types'
import { useApp } from '../state/AppContext'

const POSE: Record<PurchaseDecision, RaccoonPose> = {
  safe: 'calm',
  warning: 'think',
  critical: 'worried',
  not_recommended: 'empty',
}

const TONE = { safe: 'ok', warning: 'warn', critical: 'bad', not_recommended: 'bad' } as const

const TITLE: Record<PurchaseDecision, string> = {
  safe: 'Можно брать',
  warning: 'Лимит заметно уменьшится',
  critical: 'Будет тяжело до стипендии',
  not_recommended: 'Денег не хватит',
}

/** «Хватит ли денег?»: как покупка изменит дневной лимит. Считает сервер, Енот только показывает. */
export default function PurchasePage() {
  const { dashboard, openExpenseSheet } = useApp()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [result, setResult] = useState<PurchaseResult | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const value = parseAmount(amount)
  const sliderMax = Math.max(1000, Math.ceil(((dashboard?.budget.free_money ?? 0) * 1.2) / 500) * 500)

  // Проверяем автоматически через полсекунды после ввода.
  useEffect(() => {
    if (!Number.isFinite(value) || value <= 0) {
      setResult(null)
      return
    }
    setChecking(true)
    const timer = window.setTimeout(() => {
      api
        .checkPurchase(name.trim(), roundMoney(value))
        .then((response) => {
          setResult(response)
          setError(null)
        })
        .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Не удалось проверить покупку.'))
        .finally(() => setChecking(false))
    }, 450)
    return () => window.clearTimeout(timer)
  }, [name, value])

  const pose: RaccoonPose = checking ? 'count' : result ? POSE[result.decision] : 'hello'

  return (
    <div>
      <PageTitle title="Хочу купить" subtitle="Енот покажет, как покупка изменит лимит до стипендии" />

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card className="flex flex-col gap-4">
          <Field label="Что покупаем">
            {(id) => (
              <TextInput id={id} maxLength={60} placeholder="Например, кроссовки" value={name} onChange={(event) => setName(event.target.value)} />
            )}
          </Field>
          <Field label="Сколько стоит">
            {(id) => <MoneyInput id={id} big placeholder="0" value={amount} onChange={setAmount} />}
          </Field>
          <input
            type="range"
            min={0}
            max={sliderMax}
            step={50}
            value={Number.isFinite(value) ? Math.min(value, sliderMax) : 0}
            onChange={(event) => setAmount(event.target.value)}
            aria-label="Сумма покупки"
            className="w-full accent-[#FFDD2D]"
          />
          <p className="text-xs text-muted">Можно ввести сумму или двигать ползунок.</p>
        </Card>

        <Card className="flex flex-col items-center gap-3 text-center lg:p-6">
          <Raccoon pose={pose} size={128} />
          {!result && !checking && <p className="text-muted">Введи сумму — Енот пересчитает лимит.</p>}
          {checking && !result && <Spinner label="Считаем" />}
          {error && <ErrorNote>{error}</ErrorNote>}
          {result && (
            <div className={`flex w-full flex-col gap-4 ${checking ? 'opacity-60' : ''}`}>
              <p className="text-xl font-bold text-ink">
                <span className="mr-2 inline-block align-middle">
                  <StatusDot tone={TONE[result.decision]} />
                </span>
                {TITLE[result.decision]}
              </p>
              <div className="flex items-center justify-center gap-3">
                <div className="flex flex-col">
                  <TileLabel>Лимит сейчас</TileLabel>
                  <span className="text-2xl font-extrabold text-ink">{formatRub(result.daily_limit_before)}</span>
                </div>
                <ArrowRight className="h-5 w-5 text-muted" aria-hidden="true" />
                <div className="flex flex-col">
                  <TileLabel>После покупки</TileLabel>
                  <span className="text-2xl font-extrabold text-ink">{formatRub(result.daily_limit_after)}</span>
                </div>
              </div>
              <p className="text-sm text-muted">
                {result.limit_change !== 0 ? `${formatSignedRub(result.limit_change)} в день · ` : ''}
                останется на счетах {formatRub(result.balance_after)}
              </p>
              <p className="text-ink">{result.message}</p>
              <p className="text-xs text-muted">Ориентир, а не рекомендация: решение за тобой.</p>
              <Button
                variant="secondary"
                onClick={() =>
                  openExpenseSheet({ type: 'expense', amount: result.amount, description: name.trim(), category: 'Другое' })
                }
              >
                Купил — записать трату
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
