import type {
  CalculateRequest,
  CalculateResponse,
  ExplainRequest,
  ExplainResponse,
  PurchaseCheckRequest,
  PurchaseCheckResponse,
} from '../types'

// Пустой VITE_API_URL — запросы идут на тот же адрес (/api), а прокси Vite или nginx передаёт их в backend.
const API_URL = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {}

async function post<TResponse>(path: string, body: unknown, signal?: AbortSignal): Promise<TResponse> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError('Сервер расчётов недоступен. Проверьте, что backend запущен, и попробуйте ещё раз.')
  }

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response))
  }

  return (await response.json()) as TResponse
}

/** Достаёт понятный текст ошибки из ответа ASP.NET Core (ProblemDetails). */
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as {
      detail?: string
      title?: string
      errors?: Record<string, string[]>
    }
    const firstValidationError = data.errors ? Object.values(data.errors).flat()[0] : undefined
    return firstValidationError ?? data.detail ?? data.title ?? `Ошибка сервера (${response.status})`
  } catch {
    return `Ошибка сервера (${response.status})`
  }
}

export const api = {
  calculate: (request: CalculateRequest, signal?: AbortSignal) =>
    post<CalculateResponse>('/api/calculate', request, signal),

  checkPurchase: (request: PurchaseCheckRequest) =>
    post<PurchaseCheckResponse>('/api/purchase-check', request),

  explain: (request: ExplainRequest) =>
    post<ExplainResponse>('/api/explain', request),
}
