import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { BadgePercent, CalendarClock, LogIn, MessageCircle } from 'lucide-react'
import { Flame } from '../components/Streak'
import Logo from '../components/Logo'
import Raccoon from '../components/Raccoon'
import { Button, Card, ErrorNote, TextInput } from '../components/ui'
import { api } from '../lib/api'
import type { AuthConfig } from '../lib/types'
import { useApp } from '../state/AppContext'

const FEATURES = [
  { icon: CalendarClock, text: 'Лимит на день, 3 дня или неделю — до следующей стипендии' },
  { icon: BadgePercent, text: 'Подбор категорий кэшбэка по твоим тратам и итоги месяца' },
  { icon: MessageCircle, text: 'Енот объясняет, куда уходят деньги и как дотянуть' },
]

export default function LoginPage() {
  const { setMe } = useApp()
  const [config, setConfig] = useState<AuthConfig | null>(null)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [login, setLogin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .authConfig()
      .then(setConfig)
      .catch(() => setError('Сервер не отвечает. Проверь, что backend запущен.'))
  }, [])

  const enter = async () => {
    setMe(await api.me())
  }

  const demo = async () => {
    setBusy(true)
    setError(null)
    try {
      await api.demoLogin()
      await enter()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти.')
      setBusy(false)
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'register') await api.register(login.trim(), email.trim(), password)
      else await api.login(login.trim(), password)
      await enter()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти.')
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4 py-10">
      <div className="grid w-full max-w-md items-center gap-10 lg:max-w-5xl lg:grid-cols-2">
        <div className="hidden flex-col gap-6 lg:flex">
          <Logo />
          <h1 className="text-5xl leading-tight font-extrabold text-ink">Дотянем до стипендии вместе</h1>
          <ul className="flex flex-col gap-4">
            {FEATURES.map((feature) => (
              <li key={feature.text} className="flex items-center gap-3 text-lg text-ink">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-card">
                  <feature.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {feature.text}
              </li>
            ))}
            <li className="flex items-center gap-3 text-lg text-ink">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-card">
                <Flame lit size={24} />
              </span>
              Огонёк за каждый день, когда заходишь в приложение
            </li>
          </ul>
        </div>

        <Card className="flex flex-col gap-5 lg:p-8">
          <div className="flex items-center justify-between lg:hidden">
            <Logo />
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <Raccoon pose="hello" size={132} />
            <h2 className="text-2xl font-bold text-ink">Привет! Я Енот</h2>
            <p className="text-muted">Посчитаю, сколько можно тратить каждый день, и подскажу, какой кэшбэк выбрать. Решаешь всегда ты.</p>
          </div>

          {error && <ErrorNote>{error}</ErrorNote>}

          <div className="grid grid-cols-2 gap-1 rounded-full bg-chip p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`h-9 rounded-full text-sm font-semibold ${mode === 'login' ? 'bg-card text-ink' : 'text-muted'}`}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`h-9 rounded-full text-sm font-semibold ${mode === 'register' ? 'bg-card text-ink' : 'text-muted'}`}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3">
            <TextInput
              autoComplete="username"
              placeholder={mode === 'login' ? 'Логин или почта' : 'Логин'}
              aria-label={mode === 'login' ? 'Логин или почта' : 'Логин'}
              maxLength={32}
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              required
            />
            {mode === 'register' && (
              <TextInput
                type="email"
                autoComplete="email"
                placeholder="Почта"
                aria-label="Почта"
                maxLength={120}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            )}
            <TextInput
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              placeholder="Пароль"
              aria-label="Пароль"
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <Button type="submit" loading={busy}>
              {mode === 'register' ? 'Создать аккаунт' : 'Войти'}
            </Button>
          </form>

          <div className="flex flex-col gap-2">
            {config?.google_enabled && (
              <a
                href={api.googleLoginUrl}
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-chip font-semibold text-ink transition hover:brightness-95"
              >
                <LogIn className="h-5 w-5" aria-hidden="true" />
                Войти через Google
              </a>
            )}
            {config?.demo_enabled && (
              <Button variant="secondary" loading={busy} onClick={demo}>
                Попробовать без регистрации
              </Button>
            )}
          </div>

          <p className="text-center text-xs text-muted">
            Пароль Енотономики хранится только как хеш. Не вводи реальные пароли банков, номера карт и коды из SMS. Демо-профиль удаляется через 7 дней.{' '}
            <Link to="/privacy" className="font-medium text-ink underline">
              Как мы храним данные
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
