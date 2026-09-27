import { localHour, todayISO } from './format'
import type {
  Account,
  AccountInput,
  Analytics,
  AuthConfig,
  CashbackMonth,
  CashbackOptionInput,
  CashbackResults,
  ChatMessage,
  Dashboard,
  Me,
  OnboardingInput,
  Operation,
  OperationInput,
  PartnerOffer,
  PartnerOfferInput,
  ProfileUpdate,
  PromptPreset,
  PurchaseResult,
  Recurring,
  RecurringInput,
  Region,
  Reminder,
  AdminOverview,
  BankImportResult,
} from './types'

// Запросы идут на тот же адрес (/api): в разработке их передаёт в backend прокси Vite, в Docker — nginx.
// Поэтому cookie входа работает без настройки CORS.

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Вызывается при ответе 401: пользователь вышел или сессия истекла. */
let onUnauthorized: () => void = () => {}
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        // Защита от подделки запросов: сайт на чужом домене не может поставить этот заголовок.
        'X-Requested-With': 'limitplus',
        // Сегодняшняя дата и час пользователя: сервер может жить в другом часовом поясе.
        'X-Local-Date': todayISO(),
        'X-Local-Hour': String(localHour()),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Сервер недоступен. Проверь интернет и что backend запущен, и попробуй ещё раз.')
  }

  if (response.status === 401) {
    onUnauthorized()
    throw new ApiError(401, 'Нужно войти заново.')
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

/** Достаёт понятный текст ошибки из ответа ASP.NET Core (ProblemDetails). */
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: string; title?: string; errors?: Record<string, string[]> }
    const firstValidationError = data.errors ? Object.values(data.errors).flat()[0] : undefined
    return firstValidationError ?? data.detail ?? data.title ?? `Ошибка сервера (${response.status})`
  } catch {
    return `Ошибка сервера (${response.status})`
  }
}

const get = <T,>(path: string) => request<T>('GET', path)
const post = <T,>(path: string, body: unknown = {}) => request<T>('POST', path, body)
const put = <T,>(path: string, body: unknown) => request<T>('PUT', path, body)
const del = (path: string) => request<void>('DELETE', path)

export const api = {
  // Вход
  authConfig: () => get<AuthConfig>('/api/auth/config'),
  googleLoginUrl: '/api/auth/google',
  demoLogin: () => post<void>('/api/auth/demo'),
  register: (login: string, email: string, password: string) => post<void>('/api/auth/register', { login, email, password }),
  login: (login: string, password: string) => post<void>('/api/auth/login', { login, password }),
  logout: () => post<void>('/api/auth/logout'),

  // Профиль
  me: () => get<Me>('/api/me'),
  onboarding: (input: OnboardingInput) => post<Me>('/api/onboarding', input),
  updateProfile: (patch: ProfileUpdate) => put<Me>('/api/profile', patch),
  deleteProfile: () => del('/api/profile'),
  regions: () => get<Region[]>('/api/regions'),

  // Главная
  dashboard: () => get<Dashboard>('/api/dashboard'),
  noSpendToday: () => post<void>('/api/day/no-spend'),
  stipendReceived: (accountId: string | null) => post<void>('/api/stipend/received', { account_id: accountId }),
  checkPurchase: (name: string, amount: number) => post<PurchaseResult>('/api/purchase-check', { name, amount }),
  analytics: () => get<Analytics>('/api/analytics'),

  // Деньги
  accounts: () => get<Account[]>('/api/accounts'),
  createAccount: (input: AccountInput) => post<Account>('/api/accounts', input),
  updateAccount: (id: string, input: AccountInput) => put<Account>(`/api/accounts/${id}`, input),
  deleteAccount: (id: string) => del(`/api/accounts/${id}`),
  operations: (from?: string) => get<Operation[]>(from ? `/api/operations?from=${from}` : '/api/operations'),
  addOperation: (input: OperationInput) => post<void>('/api/operations', input),
  importOperations: (accountId: string, operations: OperationInput[], balanceIncludesOperations: boolean) =>
    post<void>('/api/operations/import', {
      account_id: accountId,
      operations,
      balance_includes_operations: balanceIncludesOperations,
    }),
  deleteOperation: (id: string) => del(`/api/operations/${id}`),
  recurring: () => get<Recurring[]>('/api/recurring'),
  createRecurring: (input: RecurringInput) => post<Recurring>('/api/recurring', input),
  updateRecurring: (id: string, input: RecurringInput) => put<Recurring>(`/api/recurring/${id}`, input),
  deleteRecurring: (id: string) => del(`/api/recurring/${id}`),
  recurringPaid: (id: string, accountId: string | null) =>
    post<void>(`/api/recurring/${id}/paid`, { account_id: accountId }),

  // Кэшбэк
  cashbackMonth: (month: string) => get<CashbackMonth>(`/api/cashback/${month}`),
  saveCashbackOptions: (month: string, options: CashbackOptionInput[]) =>
    put<CashbackMonth>(`/api/cashback/${month}/options`, { options }),
  chooseCashback: (month: string, optionIds: string[]) =>
    post<CashbackMonth>(`/api/cashback/${month}/choose`, { option_ids: optionIds }),
  cashbackResults: (month: string) => get<CashbackResults>(`/api/cashback/${month}/results`),
  partnerOffers: () => get<PartnerOffer[]>('/api/partner-offers'),
  addPartnerOffer: (input: PartnerOfferInput) => post<PartnerOffer>('/api/partner-offers', input),
  deletePartnerOffer: (id: string) => del(`/api/partner-offers/${id}`),

  // Енот
  prompts: () => get<PromptPreset[]>('/api/ai/prompts'),
  chatHistory: () => get<ChatMessage[]>('/api/ai/history'),
  clearChat: () => del('/api/ai/history'),
  ask: (message: string, promptId: string | null) => post<ChatMessage>('/api/ai/chat', { message, prompt_id: promptId }),

  // Админ-панель и отзывы
  admin: () => get<AdminOverview>('/api/admin'),
  savePrompt: (prompt: string) => put<AdminOverview>('/api/admin/prompt', { prompt }),
  feedback: (rating: number, text: string) => post<void>('/api/feedback', { rating, text }),

  // Учебная банковская выписка: сервер отдаёт уже обезличенные операции.
  importBankStatement: (accountId: string) => post<BankImportResult>('/api/bank/import', { account_id: accountId }),

  // Напоминания, согласия, статистика
  reminders: () => get<Reminder[]>('/api/notifications'),
  reminderShown: (key: string) => post<void>(`/api/notifications/${encodeURIComponent(key)}/shown`),
  consent: (kind: 'cookies' | 'personal_data', value: string) => post<void>('/api/consent', { kind, value, version: 'v1' }),
  event: (name: string) => post<void>('/api/events', { name }),
}
