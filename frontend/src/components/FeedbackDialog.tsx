import { useState } from 'react'
import { Star } from 'lucide-react'
import { api } from '../lib/api'
import { Button, ErrorNote, Sheet } from './ui'

/** Оценка от 0 до 5 и короткий отзыв. */
export default function FeedbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rating, setRating] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const close = () => {
    setRating(null)
    setText('')
    setError(null)
    setDone(false)
    onClose()
  }

  const send = async () => {
    if (rating === null) {
      setError('Выбери оценку от 0 до 5.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.feedback(rating, text.trim())
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить отзыв.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={close} title="Обратная связь">
      {done ? (
        <div className="flex flex-col gap-4">
          <p className="text-ink">Спасибо, отзыв отправлен.</p>
          <Button onClick={close}>Закрыть</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">Оцени Енотономику от 0 до 5 звёзд и, если хочешь, напиши пару слов.</p>
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Оценка от 0 до 5">
            <button
              type="button"
              role="radio"
              aria-checked={rating === 0}
              onClick={() => setRating(0)}
              className={`h-10 rounded-full px-3 text-sm font-semibold ${rating === 0 ? 'bg-ink text-page' : 'bg-chip text-ink'}`}
            >
              0
            </button>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} из 5`}
                onClick={() => setRating(value)}
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-chip"
              >
                <Star className="h-6 w-6" fill={rating !== null && value <= rating && rating > 0 ? '#FFDD2D' : 'transparent'} stroke="currentColor" />
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="Что понравилось или что улучшить"
            aria-label="Отзыв"
            className="w-full resize-none rounded-2xl border border-line bg-card px-4 py-3 text-ink placeholder:text-muted focus:border-ink focus:outline-none"
          />
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button onClick={send} loading={busy}>
            Отправить
          </Button>
        </div>
      )}
    </Sheet>
  )
}
