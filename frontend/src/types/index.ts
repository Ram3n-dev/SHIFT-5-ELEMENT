// Типы данных приложения. Поля в snake_case — так же, как в JSON API и в ТЗ.

export type AccountType = 'card' | 'cash' | 'savings'
export type OperationType = 'income' | 'expense'
export type BudgetStatus = 'safe' | 'warning' | 'critical'
export type PurchaseDecision = 'safe' | 'warning' | 'critical' | 'not_recommended'
export type ExplainTopic = 'why_limit' | 'purchase_impact' | 'reduce_risk'

export interface Account {
  id: string
  name: string
  type: AccountType
  balance: number
  include_in_spending: boolean
  created_at: string
}

export interface Operation {
  id: string
  date: string
  /** Всегда положительная сумма. Доход или расход — смотрим на type. */
  amount: number
  type: OperationType
  category: string
  description: string
  account_id: string
  is_mandatory: boolean
  is_recurring: boolean
}

export interface RecurringExpense {
  id: string
  name: string
  amount: number
  category: string
  next_date: string
  frequency: 'monthly'
  enabled: boolean
}

export interface BudgetSettings {
  stipend_date: string
  /** Когда начался текущий период — нужен только для полоски прогресса. */
  period_start: string
  manual_mandatory_expenses: number
  reserve: number
}

/** Всё, что хранится в localStorage. */
export interface BudgetState {
  version: 1
  /** null — онбординг ещё не пройден. */
  settings: BudgetSettings | null
  accounts: Account[]
  operations: Operation[]
  recurring_expenses: RecurringExpense[]
}

// ---------- Контракты API ----------

export interface CalculateRequest {
  accounts: Pick<Account, 'id' | 'name' | 'type' | 'balance' | 'include_in_spending'>[]
  stipend_date: string
  manual_mandatory_expenses: number
  reserve: number
  recurring_expenses: Pick<RecurringExpense, 'id' | 'name' | 'amount' | 'category' | 'next_date' | 'enabled'>[]
  today: string
}

export interface UpcomingPayment {
  id: string
  name: string
  amount: number
  next_date: string
}

export interface CalculateResponse {
  days_until_stipend: number
  total_balance: number
  mandatory_expenses: number
  reserve: number
  free_money: number
  daily_limit: number
  status: BudgetStatus
  message: string
  upcoming_payments: UpcomingPayment[]
}

export interface PurchaseCheckRequest {
  total_balance: number
  stipend_date: string
  mandatory_expenses: number
  reserve: number
  purchase_name: string
  purchase_amount: number
  today: string
}

export interface PurchaseCheckResponse {
  balance_after: number
  daily_limit_before: number
  daily_limit_after: number
  limit_change: number
  decision: PurchaseDecision
  message: string
}

/** Уже рассчитанные числа, которые нужно объяснить. */
export interface ExplainFacts {
  days_until_stipend?: number
  total_balance?: number
  mandatory_expenses?: number
  reserve?: number
  free_money?: number
  daily_limit?: number
  status?: BudgetStatus
  purchase_name?: string
  purchase_amount?: number
  daily_limit_after?: number
  limit_change?: number
  decision?: PurchaseDecision
}

export interface ExplainRequest extends ExplainFacts {
  topic: ExplainTopic
}

export interface ExplainResponse {
  text: string
  source: 'template' | 'llm'
}
