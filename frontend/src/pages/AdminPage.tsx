import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { AdminOverview } from '../lib/types'
import { useApp } from '../state/AppContext'
import { Button, Card, ErrorNote, PageTitle, Spinner } from '../components/ui'

function formatSeen(value: string | null) {
  if (!value) return 'ещё не заходил'
  return new Date(value).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

export default function AdminPage() {
  const { me } = useApp()
  const [data, setData] = useState<AdminOverview | null>(null)
  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!me?.user.is_admin) return
    api
      .admin()
      .then((value) => {
        setData(value)
        setPrompt(value.prompt)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Не удалось открыть админ-панель.'))
  }, [me?.user.is_admin])

  if (!me?.user.is_admin) {
    return <ErrorNote>Админ-панель доступна только администратору.</ErrorNote>
  }

  const save = async (next: string) => {
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const value = await api.savePrompt(next)
      setData(value)
      setPrompt(value.prompt)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить промпт.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageTitle title="Админ-панель" subtitle="Поведение Енота и пользователи" />
      {error && <ErrorNote>{error}</ErrorNote>}
      {!data && !error && <Spinner />}
      {data && (
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <Card className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-ink">Промпт Енота</h2>
            <p className="text-sm text-muted">
              {data.prompt_customized ? 'Сейчас используется текст ниже.' : 'Сейчас используется стандартный промпт. Его можно заменить.'}
            </p>
            <textarea
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value)
                setSaved(false)
              }}
              rows={12}
              maxLength={4000}
              aria-label="Текущий промпт языковой модели"
              className="w-full resize-y rounded-2xl border border-line bg-page px-4 py-3 text-sm text-ink focus:border-ink focus:outline-none"
            />
            <div className="flex flex-wrap gap-2">
              <Button loading={busy} onClick={() => save(prompt)}>
                Сохранить поведение
              </Button>
              <Button variant="secondary" onClick={() => save('')}>
                Вернуть стандартный
              </Button>
            </div>
            {saved && <p className="text-sm text-muted">Сохранено.</p>}
          </Card>
          <Card className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-ink">Пользователи: {data.user_count}</h2>
            <ul className="flex flex-col gap-2">
              {data.users.map((user, index) => (
                <li key={`${user.nickname}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-chip px-3 py-2">
                  <span className="font-medium text-ink">{user.nickname}</span>
                  <span className="text-right text-sm text-muted">{formatSeen(user.last_seen_at)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  )
}
