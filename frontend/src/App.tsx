import { Navigate, Route, Routes } from 'react-router-dom'
import CookieBanner from './components/CookieBanner'
import Layout from './components/Layout'
import Logo from './components/Logo'
import Raccoon from './components/Raccoon'
import { Button } from './components/ui'
import CashbackPage from './pages/CashbackPage'
import ChatPage from './pages/ChatPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import OperationsPage from './pages/OperationsPage'
import PrivacyPage from './pages/PrivacyPage'
import PurchasePage from './pages/PurchasePage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/AdminPage'
import { AppProvider, useApp } from './state/AppContext'

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
      <CookieBanner />
    </AppProvider>
  )
}

function AppRoutes() {
  const { status, me } = useApp()

  if (status === 'loading') return <Splash />
  if (status === 'offline') return <Offline />

  const signedIn = status === 'ready'
  const onboarded = me?.user.onboarded === true
  const home = !signedIn ? '/login' : onboarded ? '/dashboard' : '/onboarding'

  return (
    <Routes>
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/login" element={signedIn ? <Navigate to={home} replace /> : <LoginPage />} />
      <Route path="/onboarding" element={signedIn && !onboarded ? <OnboardingPage /> : <Navigate to={home} replace />} />

      {/* Основные экраны — только после входа и онбординга. */}
      <Route element={signedIn && onboarded ? <Layout /> : <Navigate to={home} replace />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/operations" element={<OperationsPage />} />
        <Route path="/purchase" element={<PurchasePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/cashback" element={<CashbackPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  )
}

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-page">
      <Raccoon pose="count" size={120} />
      <Logo />
    </div>
  )
}

function Offline() {
  const { retry } = useApp()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-page px-6 text-center">
      <Raccoon pose="worried" size={120} />
      <h1 className="text-2xl font-bold text-ink">Сервер не отвечает</h1>
      <p className="max-w-sm text-muted">Проверь интернет. Если запускаешь проект локально — что backend и база данных запущены.</p>
      <Button onClick={retry}>Попробовать ещё раз</Button>
    </div>
  )
}
