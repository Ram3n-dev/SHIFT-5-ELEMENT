import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import OnboardingPage from './pages/OnboardingPage'
import OperationsPage from './pages/OperationsPage'
import PurchasePage from './pages/PurchasePage'
import SettingsPage from './pages/SettingsPage'
import { BudgetProvider, useBudget } from './state/BudgetContext'

function AppRoutes() {
  const { state } = useBudget()
  const isOnboarded = state.settings !== null

  return (
    <Routes>
      {/* Онбординг. Если данные уже есть — сразу на главную. */}
      <Route path="/" element={isOnboarded ? <Navigate to="/dashboard" replace /> : <OnboardingPage />} />

      {/* Остальные экраны доступны только после онбординга. */}
      <Route element={isOnboarded ? <Layout /> : <Navigate to="/" replace />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/operations" element={<OperationsPage />} />
        <Route path="/purchase" element={<PurchasePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BudgetProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </BudgetProvider>
  )
}
