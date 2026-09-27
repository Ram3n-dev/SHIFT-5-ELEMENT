import { useState, type ChangeEvent } from 'react'
import { ImageUp } from 'lucide-react'
import { MAX_IMAGE_SIZE_BYTES, recognizeImage } from '../lib/ocr'
import Raccoon from './Raccoon'
import { ErrorNote } from './ui'

interface ScreenshotImportProps<T> {
  label: string
  parse: (text: string) => T[]
  onParsed: (items: T[]) => void
  emptyMessage: string
}

/**
 * Загрузка скриншота из приложения банка. Текст распознаётся прямо в браузере (tesseract.js),
 * картинка на сервер не отправляется. Результат пользователь проверяет и правит перед сохранением.
 */
export default function ScreenshotImport<T>({ label, parse, onParsed, emptyMessage }: ScreenshotImportProps<T>) {
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)

    if (!file.type.startsWith('image/') && !/\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name)) {
      setError('Нужна картинка: PNG или JPG.')
      return
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError('Картинка больше 8 МБ.')
      return
    }

    setProgress(0)
    try {
      const items = parse(await recognizeImage(file, setProgress))
      if (items.length === 0) setError(emptyMessage)
      else onParsed(items)
    } catch {
      setError('Не удалось распознать картинку. Попробуй другой скриншот или введи вручную.')
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {progress === null ? (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-card px-4 py-5 font-semibold text-ink transition hover:bg-chip">
          <ImageUp className="h-5 w-5" aria-hidden="true" />
          {label}
          <input type="file" accept="image/*" className="sr-only" onChange={pick} />
        </label>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3" role="status">
          <Raccoon pose="count" size={56} />
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm text-ink">Енот читает скриншот… {progress}%</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-chip">
              <span className="block h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
            </span>
          </div>
        </div>
      )}
      <p className="text-xs text-muted">Скриншот распознаётся на твоём устройстве и никуда не отправляется. Первый раз — чуть дольше.</p>
      {error && <ErrorNote>{error}</ErrorNote>}
    </div>
  )
}
