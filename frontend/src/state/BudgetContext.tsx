import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ApiError } from '../lib/api'
import type { ParsedOperation } from '../lib/csvParser'
import { addMonthISO, roundMoney, todayISO } from '../lib/format'
import { clearState, createId, emptyState, loadState, saveState } from '../lib/storage'
import type {
  Account,
  AccountType,
  BudgetSettings,
  BudgetState,
  CalculateResponse,
  Operation,
  OperationType,
  RecurringExpense,
} from '../types'

// Здесь хранится состояние приложения и действия с ним.
// Финансовые формулы здесь не считаются: расчёт лимита делает backend (POST /api/calculate).

export type CalcStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface OnboardingInput {
  card: number
  cash: number
  savings: number
  stipend_date: string
  manual_mandatory_expenses: number
  reserve: number
}

export interface NewOperation {
  type: OperationType
  amount: number
  category: string
  description: string
  account_id: string
  date: string
  is_mandatory: boolean
}

export type SettingsPatch = Partial<Pick<BudgetSettings, 'stipend_date' | 'manual_mandatory_expenses' | 'reserve'>>

interface BudgetContextValue {
  state: BudgetState
  calculation: CalculateResponse | null
  calcStatus: CalcStatus
  calcError: string | null
  recalculate: () => void
  completeOnboarding: (input: OnboardingInput) => void
  addOperation: (input: NewOperation) => void
  importOperations: (operations: ParsedOperation[], accountId: string) => void
  markRecurringPaid: (recurringId: string, accountId: string) => void
  updateSettings: (patch: SettingsPatch) => void
  saveAccount: (account: Account) => void
  deleteAccount: (accountId: string) => void
  saveRecurring: (item: RecurringExpense) => void
  deleteRecurring: (recurringId: string) => void
  resetAll: () => void
}

const BudgetContext = createContext<BudgetContextValue | null>(null)

/** Счёт по умолчанию для новых операций: первый счёт, который входит в повседневные траты. */
export function defaultAccountId(accounts: Account[]): string {
  return (accounts.find((account) => account.include_in_spending) ?? accounts[0])?.id ?? ''
}

/** Меняет баланс одного счёта: доход — плюс, расход — минус. */
function changeBalance(accounts: Account[], accountId: string, delta: number): Account[] {
  return accounts.map((account) =>
    account.id === accountId ? { ...account, balance: roundMoney(account.balance + delta) } : account,
  )
}

/** Добавляет новый элемент или заменяет существующий с тем же id. */
function upsert<T extends { id: string }>(items: T[], item: T): T[] {
  return items.some((existing) => existing.id === item.id)
    ? items.map((existing) => (existing.id === item.id ? item : existing))
    : [...items, item]
}

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BudgetState>(loadState)
  const [calculation, setCalculation] = useState<CalculateResponse | null>(null)
  const [calcStatus, setCalcStatus] = useState<CalcStatus>('idle')
  const [calcError, setCalcError] = useState<string | null>(null)
  const [retryCounter, setRetryCounter] = useState(0)
  const today = todayISO()

  // Сохраняем данные в localStorage после каждого изменения.
  // До онбординга и после удаления данных ничего не храним.
  useEffect(() => {
    if (state.settings) saveState(state)
    else clearState()
  }, [state])

  // Изменились счета, настройки или регулярные траты — просим backend пересчитать лимит.
  useEffect(() => {
    const settings = state.settings
    if (!settings) {
      setCalculation(null)
      setCalcStatus('idle')
      setCalcError(null)
      return
    }

    const controller = new AbortController()
    setCalcStatus('loading')

    api
      .calculate(
        {
          accounts: state.accounts.map(({ id, name, type, balance, include_in_spending }) => ({
            id,
            name,
            type,
            balance,
            include_in_spending,
          })),
          stipend_date: settings.stipend_date,
          manual_mandatory_expenses: settings.manual_mandatory_expenses,
          reserve: settings.reserve,
          recurring_expenses: state.recurring_expenses.map(({ id, name, amount, category, next_date, enabled }) => ({
            id,
            name,
            amount,
            category,
            next_date,
            enabled,
          })),
          today,
        },
        controller.signal,
      )
      .then((result) => {
        setCalculation(result)
        setCalcError(null)
        setCalcStatus('ready')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setCalculation(null)
        setCalcError(error instanceof ApiError ? error.message : 'Не удалось рассчитать лимит.')
        setCalcStatus('error')
      })

    return () => controller.abort()
  }, [state.settings, state.accounts, state.recurring_expenses, today, retryCounter])

  const recalculate = useCallback(() => setRetryCounter((count) => count + 1), [])

  const completeOnboarding = useCallback((input: OnboardingInput) => {
    const createdAt = new Date().toISOString()
    const account = (name: string, type: AccountType, balance: number, includeInSpending: boolean): Account => ({
      id: createId(),
      name,
      type,
      balance: roundMoney(balance),
      include_in_spending: includeInSpending,
      created_at: createdAt,
    })

    setState({
      version: 1,
      settings: {
        stipend_date: input.stipend_date,
        period_start: todayISO(),
        manual_mandatory_expenses: input.manual_mandatory_expenses,
        reserve: input.reserve,
      },
      accounts: [
        account('Карта', 'card', input.card, true),
        account('Наличные', 'cash', input.cash, true),
        // Накопления по умолчанию не тратим — пользователь может включить их в настройках.
        account('Накопления', 'savings', input.savings, false),
      ],
      operations: [],
      recurring_expenses: [],
    })
  }, [])

  const addOperation = useCallback((input: NewOperation) => {
    setState((prev) => {
      const operation: Operation = {
        id: createId(),
        ...input,
        amount: roundMoney(input.amount),
        is_mandatory: input.type === 'expense' && input.is_mandatory,
        is_recurring: false,
      }
      const delta = operation.type === 'income' ? operation.amount : -operation.amount

      // Оплаченная обязательная трата больше не висит в плане обязательных расходов.
      const settings =
        prev.settings && operation.is_mandatory
          ? {
              ...prev.settings,
              manual_mandatory_expenses: Math.max(
                0,
                roundMoney(prev.settings.manual_mandatory_expenses - operation.amount),
              ),
            }
          : prev.settings

      return {
        ...prev,
        settings,
        accounts: changeBalance(prev.accounts, operation.account_id, delta),
        operations: [operation, ...prev.operations],
      }
    })
  }, [])

  const importOperations = useCallback((parsed: ParsedOperation[], accountId: string) => {
    setState((prev) => {
      const operations: Operation[] = parsed.map((item) => ({
        id: createId(),
        date: item.date,
        amount: roundMoney(item.amount),
        type: item.type,
        category: item.category,
        description: item.description,
        account_id: accountId,
        is_mandatory: false,
        is_recurring: false,
      }))
      const delta = operations.reduce(
        (sum, operation) => sum + (operation.type === 'income' ? operation.amount : -operation.amount),
        0,
      )

      return {
        ...prev,
        accounts: changeBalance(prev.accounts, accountId, delta),
        operations: [...operations, ...prev.operations],
      }
    })
  }, [])

  const markRecurringPaid = useCallback((recurringId: string, accountId: string) => {
    setState((prev) => {
      const payment = prev.recurring_expenses.find((item) => item.id === recurringId)
      if (!payment) return prev

      const operation: Operation = {
        id: createId(),
        date: todayISO(),
        amount: payment.amount,
        type: 'expense',
        category: payment.category,
        description: payment.name,
        account_id: accountId,
        is_mandatory: true,
        is_recurring: true,
      }

      return {
        ...prev,
        accounts: changeBalance(prev.accounts, accountId, -payment.amount),
        operations: [operation, ...prev.operations],
        // Следующий платёж — через месяц, поэтому до стипендии он больше не учитывается.
        recurring_expenses: prev.recurring_expenses.map((item) =>
          item.id === recurringId ? { ...item, next_date: addMonthISO(item.next_date) } : item,
        ),
      }
    })
  }, [])

  const updateSettings = useCallback((patch: SettingsPatch) => {
    setState((prev) => {
      if (!prev.settings) return prev
      const stipendChanged = patch.stipend_date !== undefined && patch.stipend_date !== prev.settings.stipend_date
      return {
        ...prev,
        settings: {
          ...prev.settings,
          ...patch,
          // Новая дата стипендии — новый период для полоски прогресса.
          period_start: stipendChanged ? todayISO() : prev.settings.period_start,
        },
      }
    })
  }, [])

  const saveAccount = useCallback((account: Account) => {
    setState((prev) => ({ ...prev, accounts: upsert(prev.accounts, account) }))
  }, [])

  const deleteAccount = useCallback((accountId: string) => {
    // Операции удалённого счёта остаются в истории.
    setState((prev) => ({ ...prev, accounts: prev.accounts.filter((account) => account.id !== accountId) }))
  }, [])

  const saveRecurring = useCallback((item: RecurringExpense) => {
    setState((prev) => ({ ...prev, recurring_expenses: upsert(prev.recurring_expenses, item) }))
  }, [])

  const deleteRecurring = useCallback((recurringId: string) => {
    setState((prev) => ({
      ...prev,
      recurring_expenses: prev.recurring_expenses.filter((item) => item.id !== recurringId),
    }))
  }, [])

  const resetAll = useCallback(() => {
    clearState()
    setState(emptyState())
  }, [])

  const value = useMemo<BudgetContextValue>(
    () => ({
      state,
      calculation,
      calcStatus,
      calcError,
      recalculate,
      completeOnboarding,
      addOperation,
      importOperations,
      markRecurringPaid,
      updateSettings,
      saveAccount,
      deleteAccount,
      saveRecurring,
      deleteRecurring,
      resetAll,
    }),
    [
      state,
      calculation,
      calcStatus,
      calcError,
      recalculate,
      completeOnboarding,
      addOperation,
      importOperations,
      markRecurringPaid,
      updateSettings,
      saveAccount,
      deleteAccount,
      saveRecurring,
      deleteRecurring,
      resetAll,
    ],
  )

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
}

export function useBudget(): BudgetContextValue {
  const context = useContext(BudgetContext)
  if (!context) {
    throw new Error('useBudget нужно вызывать внутри BudgetProvider')
  }
  return context
}
