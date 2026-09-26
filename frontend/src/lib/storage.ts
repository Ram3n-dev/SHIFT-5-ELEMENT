import type { BudgetState } from '../types'

// Все данные пользователя хранятся только здесь — в localStorage этого браузера.
const STORAGE_KEY = 'limit-plus:v1'

export function emptyState(): BudgetState {
  return { version: 1, settings: null, accounts: [], operations: [], recurring_expenses: [] }
}

export function loadState(): BudgetState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()

    const parsed = JSON.parse(raw) as Partial<BudgetState>
    const looksValid =
      parsed.version === 1 &&
      Array.isArray(parsed.accounts) &&
      Array.isArray(parsed.operations) &&
      Array.isArray(parsed.recurring_expenses)

    return looksValid ? (parsed as BudgetState) : emptyState()
  } catch {
    // Повреждённые данные или localStorage недоступен — начинаем с чистого листа.
    return emptyState()
  }
}

export function saveState(state: BudgetState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Например, приватный режим браузера: приложение работает, но без сохранения.
  }
}

/** Удаляет все данные Лимит+ из браузера. */
export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Нечего удалять
  }
}

/** Уникальный id. crypto.randomUUID есть не везде (например, при открытии по IP в локальной сети). */
export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
