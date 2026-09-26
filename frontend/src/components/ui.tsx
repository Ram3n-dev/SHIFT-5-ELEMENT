import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { LoaderCircle, TriangleAlert } from 'lucide-react'

// Небольшие общие элементы интерфейса, чтобы не повторять одни и те же классы Tailwind.

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 ${className}`}>{children}</section>
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'md' | 'sm'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-teal-600 text-white hover:bg-teal-700 disabled:bg-slate-300',
  secondary: 'bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-slate-300',
  ghost: 'text-teal-700 hover:bg-teal-50 disabled:text-slate-400',
}

const BUTTON_SIZES: Record<ButtonSize, string> = {
  md: 'px-4 py-3 text-base',
  sm: 'px-3 py-2 text-sm',
}

/**
 * Классы кнопки — подходят и для ссылок (Link), которые выглядят как кнопки.
 * В extra передавайте только раскладку (например, w-full), а не отступы и размер текста.
 */
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra = ''): string {
  return (
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl font-semibold transition-colors ' +
    'disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ' +
    `${BUTTON_SIZES[size]} ${BUTTON_VARIANTS[variant]} ${extra}`
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />
}

/** Маленькая кнопка-иконка, например «Изменить» или «Удалить». */
export function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="cursor-pointer rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
    >
      {children}
    </button>
  )
}

export const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none ' +
  'transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100'

interface FieldProps {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}

export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  )
}

export function Spinner({ className = 'size-5' }: { className?: string }) {
  return <LoaderCircle className={`animate-spin ${className}`} aria-hidden="true" />
}

export function ErrorState({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <div role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
      <p className="flex gap-2">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </p>
      {children && <div className="mt-3 flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}

export function EmptyState({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {text && <p className="mt-1 text-sm text-slate-500">{text}</p>}
      {children && <div className="mt-4 flex justify-center">{children}</div>}
    </div>
  )
}
