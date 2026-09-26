import { useNavigate } from 'react-router-dom'
import BudgetSetupForm from '../components/BudgetSetupForm'
import Logo from '../components/Logo'
import PrivacyNotice from '../components/PrivacyNotice'
import { useBudget } from '../state/BudgetContext'

export default function OnboardingPage() {
  const { completeOnboarding } = useBudget()
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh bg-linear-to-b from-teal-50 to-slate-50 text-slate-900">
      <main className="mx-auto max-w-lg px-4 pb-10 pt-6">
        <Logo />
        <h1 className="mt-8 text-3xl font-bold tracking-tight">Сколько можно тратить сегодня?</h1>
        <p className="mt-2 text-base text-slate-600">Рассчитаем дневной лимит до следующей стипендии</p>

        <div className="mt-6">
          <BudgetSetupForm
            onSubmit={(input) => {
              completeOnboarding(input)
              navigate('/dashboard')
            }}
          />
        </div>

        <PrivacyNotice className="mt-6" />
      </main>
    </div>
  )
}
