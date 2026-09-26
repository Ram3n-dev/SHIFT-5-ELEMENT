import { Link } from 'react-router-dom'
import { Plus, ShoppingBag, Upload } from 'lucide-react'
import AccountList from '../components/AccountList'
import AiExplanation, { budgetFacts } from '../components/AiExplanation'
import DailyLimitCard from '../components/DailyLimitCard'
import FinancialSummary from '../components/FinancialSummary'
import RecurringExpensesList from '../components/RecurringExpensesList'
import StipendCountdown from '../components/StipendCountdown'
import { Button, buttonClass } from '../components/ui'
import { defaultAccountId, useBudget } from '../state/BudgetContext'

export default function DashboardPage() {
  const { state, calculation, calcStatus, calcError, recalculate, markRecurringPaid } = useBudget()
  const settings = state.settings
  if (!settings) return null

  // Регулярный платёж, отмеченный «Оплачено», списывается с основного счёта.
  const payAccountId = defaultAccountId(state.accounts)
  const payAccountName = state.accounts.find((account) => account.id === payAccountId)?.name

  return (
    <div className="space-y-4">
      <StipendCountdown settings={settings} days={calculation?.days_until_stipend ?? null} />

      <DailyLimitCard calculation={calculation} status={calcStatus} error={calcError} onRetry={recalculate} />

      {calculation && <FinancialSummary calculation={calculation} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/purchase" className={buttonClass('primary')}>
          <ShoppingBag className="size-5" aria-hidden="true" />
          Проверить покупку
        </Link>
        <Link to="/operations" className={buttonClass('secondary')}>
          <Plus className="size-5" aria-hidden="true" />
          Добавить расход
        </Link>
      </div>

      {calculation && <AiExplanation topics={['why_limit', 'reduce_risk']} facts={budgetFacts(calculation)} />}

      <AccountList accounts={state.accounts} />

      <RecurringExpensesList
        title="Ближайшие обязательные платежи"
        items={calculation?.upcoming_payments ?? []}
        emptyText="До стипендии регулярных платежей нет. Добавить их можно в настройках."
        renderActions={(item) => (
          <Button
            variant="secondary"
            size="sm"
            disabled={!payAccountId}
            title={payAccountName ? `Списать с «${payAccountName}»` : undefined}
            onClick={() => markRecurringPaid(item.id, payAccountId)}
          >
            Оплачено
          </Button>
        )}
      />

      <Link to="/operations?import=1" className={buttonClass('ghost', 'md', 'w-full')}>
        <Upload className="size-5" aria-hidden="true" />
        Импорт учебной выписки
      </Link>
    </div>
  )
}
