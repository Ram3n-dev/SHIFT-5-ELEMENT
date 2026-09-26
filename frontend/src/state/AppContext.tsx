import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ApiError, api, setUnauthorizedHandler } from '../lib/api'
import { applyTheme } from '../lib/theme'
import type { Dashboard, Me, OperationInput, RaccoonPose } from '../lib/types'

// Общее состояние приложения: кто вошёл, данные главной, окно «Добавить трату» и всплывающие сообщения.
// Все расчёты делает backend — здесь только загрузка и хранение ответов.

/** loading — ещё не знаем, вошёл ли пользователь; guest — не вошёл; ready — вошёл; offline — сервер не отвечает. */
export type SessionStatus = 'loading' | 'guest' | 'ready' | 'offline'

export interface Toast {
  id: number
  title: string
  text?: string
  pose?: RaccoonPose
}

interface AppContextValue {
  status: SessionStatus
  me: Me | null
  setMe: (me: Me) => void
  retry: () => void
  logout: () => Promise<void>

  dashboard: Dashboard | null
  dashboardError: string | null
  reloadDashboard: () => Promise<Dashboard | null>
  /** Растёт после каждого изменения данных — страницы по нему перечитывают свои списки. */
  version: number
  /** Данные изменились: перечитать главную и списки. Возвращает свежую главную. */
  dataChanged: () => Promise<Dashboard | null>

  expenseSheet: { open: boolean; preset: Partial<OperationInput> | null }
  openExpenseSheet: (preset?: Partial<OperationInput>) => void
  closeExpenseSheet: () => void

  toasts: Toast[]
  showToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: number) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [me, setMeState] = useState<Me | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [expenseSheet, setExpenseSheet] = useState<{ open: boolean; preset: Partial<OperationInput> | null }>({
    open: false,
    preset: null,
  })
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

  const setMe = useCallback((value: Me) => {
    setMeState(value)
    setStatus('ready')
    applyTheme(value.profile.theme)
  }, [])

  const signedOut = useCallback(() => {
    setMeState(null)
    setDashboard(null)
    setStatus('guest')
  }, [])

  // Ответ 401 на любом запросе — сессия закончилась, показываем вход.
  useEffect(() => {
    setUnauthorizedHandler(signedOut)
  }, [signedOut])

  // При открытии приложения узнаём, вошёл ли пользователь (cookie lp_auth отправляется автоматически).
  useEffect(() => {
    let cancelled = false
    api
      .me()
      .then((value) => {
        if (!cancelled) setMe(value)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 401) signedOut()
        else setStatus('offline')
      })
    return () => {
      cancelled = true
    }
  }, [attempt, setMe, signedOut])

  const reloadDashboard = useCallback(async () => {
    try {
      const value = await api.dashboard()
      setDashboard(value)
      setDashboardError(null)
      return value
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Не удалось загрузить данные.')
      return null
    }
  }, [])

  const onboarded = status === 'ready' && me?.user.onboarded === true
  useEffect(() => {
    if (onboarded) reloadDashboard()
  }, [onboarded, reloadDashboard])

  const dataChanged = useCallback(() => {
    setVersion((value) => value + 1)
    return reloadDashboard()
  }, [reloadDashboard])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } finally {
      signedOut()
    }
  }, [signedOut])

  const dismissToast = useCallback((id: number) => {
    setToasts((list) => list.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = ++toastId.current
      setToasts((list) => [...list.slice(-2), { ...toast, id }])
      window.setTimeout(() => dismissToast(id), 7000)
    },
    [dismissToast],
  )

  const value = useMemo<AppContextValue>(
    () => ({
      status,
      me,
      setMe,
      retry: () => {
        setStatus('loading')
        setAttempt((value) => value + 1)
      },
      logout,
      dashboard,
      dashboardError,
      reloadDashboard,
      version,
      dataChanged,
      expenseSheet,
      openExpenseSheet: (preset) => setExpenseSheet({ open: true, preset: preset ?? null }),
      closeExpenseSheet: () => setExpenseSheet({ open: false, preset: null }),
      toasts,
      showToast,
      dismissToast,
    }),
    [status, me, setMe, logout, dashboard, dashboardError, reloadDashboard, version, dataChanged, expenseSheet, toasts, showToast, dismissToast],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp должен вызываться внутри AppProvider')
  return value
}
