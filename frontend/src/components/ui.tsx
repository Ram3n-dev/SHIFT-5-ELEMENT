import {
  useEffect,
  useId,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { LoaderCircle, X } from 'lucide-react'

// Общие элементы интерфейса. Цвета — только токены из index.css (bg-card, text-muted, bg-accent...).

export function Card({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-3xl bg-card p-4 sm:p-5 ${className}`} {...rest}>
      {children}
    </div>
  )
}

/** Подпись плитки: «Сегодня можно», «До стипендии». */
export function TileLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`text-sm font-medium text-muted ${className}`}>{children}</span>
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-ink hover:brightness-95',
  secondary: 'bg-chip text-ink hover:brightness-95',
  ghost: 'text-ink hover:bg-chip',
  danger: 'bg-chip text-bad hover:brightness-95',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md'
  loading?: boolean
}

export function Button({ variant = 'primary', size = 'md', loading = false, className = '', children, disabled, ...rest }: ButtonProps) {
  const sizing = size === 'sm' ? 'h-10 px-4 text-sm' : 'h-12 px-5 text-base'
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${VARIANTS[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  size?: 'sm' | 'md'
}

/** Круглая кнопка с иконкой. label обязателен — его читает скринридер. Цвет иконки задаёт className. */
export function IconButton({ label, size = 'md', className = '', children, ...rest }: IconButtonProps) {
  const sizing = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-full transition hover:bg-chip ${sizing} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

interface FieldProps {
  label: string
  hint?: string
  error?: string | null
  children: (id: string) => ReactNode
}

/** Поле формы: подпись, само поле, подсказка или ошибка. */
export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-muted">
        {label}
      </label>
      {children(id)}
      {error ? <span className="text-sm text-bad">{error}</span> : hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </div>
  )
}

// Высота и размер шрифта — отдельно: два разных h-* или text-* в одном className конфликтуют.
const inputClass =
  'w-full rounded-2xl border border-line bg-card px-4 text-ink placeholder:text-muted focus:border-ink focus:outline-none'
const inputSize = 'h-12 text-base'

export function TextInput({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputClass} ${inputSize} ${className}`} {...rest} />
}

interface MoneyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string
  onChange: (value: string) => void
  big?: boolean
}

/** Сумма в рублях. Храним строку: так удобнее вводить «1 500,50». */
export function MoneyInput({ value, onChange, big = false, className = '', ...rest }: MoneyInputProps) {
  return (
    <div className="relative">
      <input
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/[^\d\s.,]/g, ''))}
        className={`${inputClass} pr-10 ${big ? 'h-16 text-3xl font-bold' : inputSize} ${className}`}
        {...rest}
      />
      <span className={`pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 font-semibold text-muted ${big ? 'text-2xl' : ''}`}>₽</span>
    </div>
  )
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${inputClass} ${inputSize} appearance-none ${className}`} {...rest}>
      {children}
    </select>
  )
}

interface SegmentedProps<T extends string | number> {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  label: string
  className?: string
}

/** Переключатель из нескольких вариантов: «День / 3 дня / Неделя», тема. */
export function Segmented<T extends string | number>({ value, options, onChange, label, className = '' }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={`flex gap-1 rounded-full bg-chip p-1 ${className}`}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`h-9 flex-1 rounded-full px-3 text-sm font-semibold whitespace-nowrap transition ${active ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/** Чип-выбор: категория, сумма-подсказка, готовый вопрос. */
export function Chip({ active = false, className = '', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition ${active ? 'bg-ink text-page' : 'bg-chip text-ink hover:brightness-95'} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (value: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-1">
      <span className="flex flex-col">
        <span className="text-base text-ink">{label}</span>
        {description && <span className="text-sm text-muted">{description}</span>}
      </span>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span
        aria-hidden="true"
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-accent' : 'bg-line'} peer-focus-visible:ring-2 peer-focus-visible:ring-ink`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
      </span>
    </label>
  )
}

/** Маленькая цветная точка статуса. Цвет карточек не меняем — статус показывают точка, текст и Енот. */
export function StatusDot({ tone }: { tone: 'ok' | 'warn' | 'bad' | 'muted' }) {
  const color = { ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', muted: 'bg-muted' }[tone]
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${color}`} aria-hidden="true" />
}

export function Spinner({ label = 'Загрузка' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-10 text-muted" role="status">
      <LoaderCircle className="h-6 w-6 animate-spin" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-2xl bg-chip px-4 py-3 text-sm text-ink">
      <span className="mt-1.5">
        <StatusDot tone="bad" />
      </span>
      <span>{children}</span>
    </p>
  )
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-ink lg:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}

/** Окно поверх экрана: на телефоне выезжает снизу, на компьютере — по центру. Esc и клик по фону закрывают. */
export function Sheet({ open, onClose, title, children, wide = false }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`slide-up relative flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-page sm:rounded-3xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h2 className="text-xl font-bold text-ink">{title}</h2>
          <IconButton label="Закрыть" onClick={onClose}>
            <X className="h-5 w-5" />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-5 pb-6">{children}</div>
      </div>
    </div>
  )
}
