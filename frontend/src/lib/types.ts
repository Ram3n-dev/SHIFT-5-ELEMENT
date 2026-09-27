// Типы данных API. Поля в snake_case — так их отдаёт backend.

export type AccountType = 'card' | 'cash' | 'savings'
export type OperationType = 'expense' | 'income'
export type BudgetStatus = 'safe' | 'warning' | 'critical'
export type PurchaseDecision = 'safe' | 'warning' | 'critical' | 'not_recommended'
export type DayStatus = 'none' | 'kept' | 'over' | 'missed' | 'frozen' | 'pending'
export type Theme = 'system' | 'light' | 'dark'
export type RaccoonPose = 'calm' | 'hello' | 'count' | 'think' | 'eureka' | 'worried' | 'empty' | 'celebrate' | 'sleep'

export interface AuthConfig {
  google_enabled: boolean
  demo_enabled: boolean
}

export interface UserInfo {
  id: string
  name: string
  email: string | null
  is_demo: boolean
  onboarded: boolean
  pd_consent: boolean
  is_admin: boolean
}

export interface Profile {
  city: string | null
  region_code: string | null
  region_name: string | null
  stipend_amount: number
  stipend_day: number
  next_stipend_date: string
  mandatory_monthly: number
  mandatory_left: number
  reserve: number
  limit_period_days: number
  theme: Theme
  notifications_enabled: boolean
}

export interface Me {
  user: UserInfo
  profile: Profile
}

export interface Account {
  id: string
  name: string
  type: AccountType
  balance: number
  include_in_spending: boolean
}

export interface Operation {
  id: string
  account_id: string | null
  account_name: string | null
  type: OperationType
  amount: number
  category: string
  description: string
  date: string
  is_mandatory: boolean
  is_recurring: boolean
}

export interface Recurring {
  id: string
  name: string
  amount: number
  category: string
  next_date: string
  enabled: boolean
}

export interface UpcomingPayment {
  id: string
  name: string
  amount: number
  next_date: string
}

export interface Budget {
  days_until_stipend: number
  stipend_date: string
  total_balance: number
  mandatory_expenses: number
  reserve: number
  free_money: number
  free_at_day_start: number
  day_limit: number
  spent_today: number
  left_today: number
  period_days: number
  period_limit: number
  left_in_period: number
  status: BudgetStatus
  message: string
  upcoming_payments: UpcomingPayment[]
}

export interface StreakDay {
  date: string
  status: DayStatus
}

export interface Streak {
  current: number
  best: number
  today_status: DayStatus
  freeze_available: boolean
  week: StreakDay[]
}

export interface StipendInfo {
  next_date: string
  days_until: number
  amount: number
  due: boolean
  due_date: string
}

export interface Regional {
  region_name: string
  food_basket_month: number
  food_per_day: number
  is_russia_average: boolean
  period: string
  source: string
}

export interface CashbackTile {
  month: string
  month_name: string
  chosen: string[]
  earned_so_far: number
  next_month_ready: boolean
}

export interface Dashboard {
  name: string
  budget: Budget
  streak: Streak
  stipend: StipendInfo
  regional: Regional | null
  below_food_minimum: boolean
  accounts: Account[]
  tip: string
  cashback: CashbackTile
}

export interface CategoryChange {
  category: string
  current: number
  previous: number
  delta: number
}

export interface Analytics {
  comparison: {
    has_previous: boolean
    days_compared: number
    current_total: number
    previous_total: number
    increases: CategoryChange[]
  }
  waste: { kind: string; category: string; count: number; sum: number }[]
  lasting: {
    average_per_day: number
    day_limit: number
    over_pace: boolean
    top_category: string | null
    top_category_per_day: number
    saving_if_halved: number
  }
  by_category: Record<string, number>
}

export interface PurchaseResult {
  amount: number
  balance_after: number
  daily_limit_before: number
  daily_limit_after: number
  limit_change: number
  left_today_after: number
  decision: PurchaseDecision
  message: string
}

export interface CashbackOption {
  id: string
  name: string
  percent: number
  category: string | null
  chosen: boolean
}

export interface CashbackPick {
  id: string
  name: string
  percent: number
  category: string | null
  expected_rub: number
}

export interface CashbackPlan {
  best: CashbackPick[]
  rest: CashbackPick[]
  expected_total: number
  cap_reached: boolean
}

export interface CashbackMonth {
  month: string
  month_name: string
  options: CashbackOption[]
  plan: CashbackPlan | null
  explanation: string | null
}

export interface CashbackMonthResult {
  per_option: CashbackPick[]
  total: number
  best_possible: number
  one_percent: number
  cap_reached: boolean
}

export interface CashbackResults {
  month: string
  month_name: string
  result: CashbackMonthResult | null
  all_time_total: number
}

export interface PartnerOffer {
  id: string
  merchant: string
  percent: number
  category: string | null
  valid_until: string | null
}

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  text: string
  source: string | null
  created_at: string
}

export interface PromptPreset {
  id: string
  text: string
}

export interface Reminder {
  key: string
  title: string
  text: string
  pose: RaccoonPose
}

export interface Region {
  code: string
  name: string
  cities: string[]
}

// ---------- Тела запросов ----------

export interface OnboardingInput {
  pd_consent: boolean
  city: string | null
  region_code: string | null
  stipend_amount: number
  stipend_day: number
  card: number
  cash: number
  savings: number
  mandatory_monthly: number
  reserve: number
  limit_period_days: number
}

export type ProfileUpdate = Partial<
  Pick<
    Profile,
    | 'city'
    | 'region_code'
    | 'stipend_amount'
    | 'stipend_day'
    | 'mandatory_monthly'
    | 'mandatory_left'
    | 'reserve'
    | 'limit_period_days'
    | 'theme'
    | 'notifications_enabled'
  >
>

export interface AccountInput {
  name: string
  type: AccountType
  balance: number
  include_in_spending: boolean
}

export interface OperationInput {
  type: OperationType
  amount: number
  category: string
  description: string
  account_id: string | null
  date: string
  is_mandatory: boolean
}

export interface RecurringInput {
  name: string
  amount: number
  category: string
  next_date: string
  enabled: boolean
}

export interface CashbackOptionInput {
  name: string
  percent: number
  category: string | null
}

export interface PartnerOfferInput {
  merchant: string
  percent: number
  category: string | null
  valid_until: string | null
}

export interface SafeBankOperation {
  id: string
  date: string
  amount: number
  currency: string
  merchant: string
  category: string
  description: string
  type: 'expense' | 'income'
  mcc: string | null
  operation_type: 'debit' | 'credit'
}

export interface BankImportResult {
  imported: number
  skipped: number
  balance: number | null
  operations: SafeBankOperation[]
}

export interface AdminUser {
  nickname: string
  last_seen_at: string | null
}

export interface AdminOverview {
  prompt: string
  prompt_customized: boolean
  user_count: number
  users: AdminUser[]
}
