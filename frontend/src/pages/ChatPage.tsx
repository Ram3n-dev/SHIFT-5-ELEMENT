<<<<<<< HEAD
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
=======
import { useEffect, useRef, useState, type FormEvent } from 'react'
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
import { useSearchParams } from 'react-router-dom'
import { SendHorizontal, Trash2 } from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'
import Raccoon from '../components/Raccoon'
import { ErrorNote, IconButton, Spinner } from '../components/ui'
import { api } from '../lib/api'
import type { ChatMessage, PromptPreset, RaccoonPose } from '../lib/types'

// Чат с Енотом. Цифры считает сервер, ИИ только объясняет их простыми словами.
// Пока ответ готовится, Енот думает, когда готов — «эврика».

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null)
  const [prompts, setPrompts] = useState<PromptPreset[]>([])
  const [text, setText] = useState('')
  const [waiting, setWaiting] = useState(false)
  const [pose, setPose] = useState<RaccoonPose>('hello')
  const [error, setError] = useState<string | null>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const bottom = useRef<HTMLDivElement>(null)
<<<<<<< HEAD
  const scroller = useRef<HTMLDivElement>(null)
=======
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
  const eurekaTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    Promise.all([api.chatHistory(), api.prompts()])
      .then(([history, presets]) => {
        setMessages(history)
        setPrompts(presets)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Не удалось открыть чат.'))
    return () => window.clearTimeout(eurekaTimer.current)
  }, [])

<<<<<<< HEAD
  useLayoutEffect(() => {
    const node = scroller.current
    if (!node) return
    node.scrollTop = node.scrollHeight
=======
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
  }, [messages, waiting])

  const ask = async (message: string, promptId: string | null) => {
    if (waiting) return
    setError(null)
    setWaiting(true)
    setPose('think')
    const question: ChatMessage = { id: -Date.now(), role: 'user', text: message, source: null, created_at: new Date().toISOString() }
    setMessages((list) => [...(list ?? []), question])
    try {
      const answer = await api.ask(message, promptId)
      setMessages((list) => [...(list ?? []), answer])
      setPose('eureka')
      window.clearTimeout(eurekaTimer.current)
      eurekaTimer.current = window.setTimeout(() => setPose('calm'), 2600)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Енот не смог ответить.')
      setPose('worried')
    } finally {
      setWaiting(false)
    }
  }

  // Переход с главной вида /chat?q=why_limit — как только чат загрузился, задаём этот вопрос.
  const presetId = searchParams.get('q')
  const loaded = messages !== null && prompts.length > 0
  useEffect(() => {
    if (!loaded || !presetId) return
    setSearchParams({}, { replace: true })
    const preset = prompts.find((item) => item.id === presetId)
    if (preset) ask(preset.text, preset.id)
  }, [loaded, presetId])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const message = text.trim()
    if (!message) return
    setText('')
    ask(message, null)
  }

  return (
<<<<<<< HEAD
    <div className="flex h-[calc(100dvh-12rem)] flex-col lg:h-[calc(100dvh-6rem)]">
=======
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col lg:min-h-[calc(100dvh-5rem)]">
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
      <div className="mb-3 flex items-center gap-3">
        <Raccoon pose={pose} size={72} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-ink">Енот</h1>
          <p className="text-sm text-muted">{waiting ? 'Думает…' : 'Объясняет твои цифры. Ориентир, а не рекомендация.'}</p>
        </div>
        {messages && messages.length > 0 && (
          <IconButton label="Очистить историю" onClick={() => setClearOpen(true)} className="text-muted">
            <Trash2 className="h-5 w-5" />
          </IconButton>
        )}
      </div>

<<<<<<< HEAD
      <div ref={scroller} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-4">
=======
      <div className="flex flex-1 flex-col gap-3 pb-4">
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
        {messages === null && !error && <Spinner />}
        {messages?.length === 0 && (
          <div className="rounded-3xl bg-card p-5 text-ink">
            Привет! Я считаю лимит, огонёк и кэшбэк по твоим записям и объясняю, что происходит с деньгами. Выбери вопрос ниже или
            напиши свой. Про кредиты, займы и инвестиции не подскажу — это не ко мне.
          </div>
        )}
        {messages?.map((message) => (
          <Bubble key={message.id} message={message} />
        ))}
        {waiting && (
          <div className="flex w-fit gap-1 rounded-3xl rounded-tl-md bg-card px-5 py-4" aria-label="Енот печатает">
            <span className="rc-dot h-2 w-2 rounded-full bg-muted" />
            <span className="rc-dot h-2 w-2 rounded-full bg-muted" />
            <span className="rc-dot h-2 w-2 rounded-full bg-muted" />
          </div>
        )}
        {error && <ErrorNote>{error}</ErrorNote>}
        <div ref={bottom} />
      </div>

<<<<<<< HEAD
      <div className="flex flex-col gap-3 bg-page pt-2 pb-1">
=======
      <div className="sticky bottom-24 flex flex-col gap-3 bg-page pt-2 pb-1 lg:bottom-4">
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
        {prompts.length > 0 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
            {prompts.map((preset) => (
              <button
                key={preset.id}
                type="button"
                disabled={waiting}
                onClick={() => ask(preset.text, preset.id)}
                className="h-10 shrink-0 rounded-full bg-card px-4 text-sm font-medium whitespace-nowrap text-ink transition hover:bg-chip disabled:opacity-50"
              >
                {preset.text}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={submit} className="flex items-center gap-2">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={500}
            placeholder="Спроси Енота про свои траты"
            aria-label="Вопрос Еноту"
            className="h-12 flex-1 rounded-full border border-line bg-card px-5 text-base text-ink placeholder:text-muted focus:border-ink focus:outline-none"
          />
          <button
            type="submit"
            disabled={waiting || text.trim() === ''}
            aria-label="Отправить"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition disabled:opacity-50"
          >
            <SendHorizontal className="h-5 w-5" />
          </button>
        </form>
      </div>

      <ConfirmDialog
        open={clearOpen}
        title="Очистить историю?"
        text="Все сообщения с Енотом удалятся. Лимит и операции не изменятся."
        confirmLabel="Очистить"
        onClose={() => setClearOpen(false)}
        onConfirm={async () => {
          await api.clearChat()
          setMessages([])
          setPose('hello')
        }}
      />
    </div>
  )
}

function Bubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return <div className="max-w-[85%] self-end rounded-3xl rounded-br-md bg-ink px-4 py-3 text-page lg:max-w-[70%]">{message.text}</div>
  }
  return (
    <div className="pop-in flex max-w-[92%] flex-col gap-2 rounded-3xl rounded-tl-md bg-card px-4 py-3 lg:max-w-[75%]">
      <p className="leading-relaxed whitespace-pre-line text-ink">{message.text}</p>
      <span className="text-xs text-muted">
<<<<<<< HEAD
        {message.source === 'llm' ? 'Ответ ИИ по расчётам Енотономики' : 'Расчёт Енотономики'} · ориентир, а не рекомендация
=======
        {message.source === 'llm' ? 'Ответ ИИ по расчётам Лимит+' : 'Расчёт Лимит+'} · ориентир, а не рекомендация
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
      </span>
    </div>
  )
}
