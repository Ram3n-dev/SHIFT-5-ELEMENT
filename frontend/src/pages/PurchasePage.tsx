import { useState } from 'react'
import AiExplanation, { budgetFacts } from '../components/AiExplanation'
import PurchaseCheckForm from '../components/PurchaseCheckForm'
import PurchaseResult from '../components/PurchaseResult'
import { Button, ErrorState } from '../components/ui'
import { api } from '../lib/api'
import { formatRub, pluralDays, todayISO } from '../lib/format'
import { useBudget } from '../state/BudgetContext'
import type { PurchaseCheckResponse } from '../types'

interface CheckedPurchase {
  id: number
  name: string
  amount: number
  result: PurchaseCheckResponse
}

export default function PurchasePage() {
  const { state, calculation, calcStatus, calcError, recalculate } = useBudget()
  const [checked, setChecked] = useState<CheckedPurchase | null>(null)

  async function checkPurchase(name: string, amount: number) {
    if (!calculation || !state.settings) {
      throw new Error('Сначала дождитесь расчёта дневного лимита.')
    }

    // Числа для проверки берём из готового расчёта: backend сам посчитает лимит до и после покупки.
    const result = await api.checkPurchase({
      total_balance: calculation.total_balance,
      stipend_date: state.settings.stipend_date,
      mandatory_expenses: calculation.mandatory_expenses,
      reserve: calculation.reserve,
      purchase_name: name,
      purchase_amount: amount,
      today: todayISO(),
    })
    setChecked({ id: Date.now(), name, amount, result })
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Проверка покупки</h1>
        <p className="mt-1 text-sm text-slate-600">Узнайте до оплаты, как покупка изменит дневной лимит.</p>
      </div>

      {calcStatus === 'error' && (
        <ErrorState message={calcError ?? 'Не удалось рассчитать лимит.'}>
          <Button variant="secondary" size="sm" onClick={recalculate}>
            Повторить
          </Button>
        </ErrorState>
      )}

      {calculation && (
        <p className="rounded-2xl bg-white p-4 text-sm text-slate-700 ring-1 ring-slate-200">
          Сейчас можно тратить до <span className="font-semibold text-slate-900">{formatRub(calculation.daily_limit)}</span>{' '}
          в день · до стипендии {calculation.days_until_stipend} {pluralDays(calculation.days_until_stipend)}
        </p>
      )}

      <PurchaseCheckForm disabled={!calculation} onCheck={checkPurchase} />

      {checked && <PurchaseResult name={checked.name} amount={checked.amount} result={checked.result} />}

      {checked && calculation && (
        <AiExplanation
          key={checked.id}
          topics={['why_limit', 'purchase_impact', 'reduce_risk']}
          facts={{
            ...budgetFacts(calculation),
            daily_limit: checked.result.daily_limit_before,
            purchase_name: checked.name,
            purchase_amount: checked.amount,
            daily_limit_after: checked.result.daily_limit_after,
            limit_change: checked.result.limit_change,
            decision: checked.result.decision,
          }}
        />
      )}
    </div>
  )
}
