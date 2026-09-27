// Форматирование сумм и дат для интерфейса. Финансовых формул здесь нет — они на backend.

const moneyFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })
const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
const weekdayFormatter = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' })
const MINUS = '−'

/** 3400 → «3 400 ₽», −65 → «−65 ₽». */
export function formatRub(value: number): string {
  const sign = value < 0 ? MINUS : ''
  return `${sign}${moneyFormatter.format(Math.abs(value))} ₽`
}

/** Сумма со знаком: «+2 500 ₽» или «−180 ₽». */
export function formatSignedRub(value: number): string {
  return value > 0 ? `+${formatRub(value)}` : formatRub(value)
}

/** 5 → «5%», 1.5 → «1,5%». */
export function formatPercent(value: number): string {
  return `${moneyFormatter.format(value)}%`
}

/** Убирает хвосты вроде 0.30000000000000004 после сложения копеек. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

/** Сегодняшняя дата по часам пользователя в формате ГГГГ-ММ-ДД. */
export function todayISO(): string {
  return toISODate(new Date())
}

export function localHour(): number {
  return new Date().getHours()
}

export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function isValidISODate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  return toISODate(parseISODate(iso)) === iso
}

export function addDaysISO(iso: string, days: number): string {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export function daysBetween(fromISO: string, toISO: string): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((parseISODate(toISO).getTime() - parseISODate(fromISO).getTime()) / msPerDay)
}

/** «6 октября» */
export function formatDate(iso: string): string {
  return dateFormatter.format(parseISODate(iso))
}

/** «пн», «вт» */
export function formatWeekday(iso: string): string {
  return weekdayFormatter.format(parseISODate(iso))
}

/** «Сегодня», «Вчера» или «24 сентября» — заголовок группы операций. */
export function formatDayTitle(iso: string): string {
  const today = todayISO()
  if (iso === today) return 'Сегодня'
  if (iso === addDaysISO(today, -1)) return 'Вчера'
  return formatDate(iso)
}

function monthStart(offset: number): Date {
  const date = new Date()
  date.setDate(1)
  date.setMonth(date.getMonth() + offset)
  return date
}

/** Месяц в формате API: «2026-10». offset — сколько месяцев вперёд от текущего. */
export function monthKey(offset = 0): string {
  const date = monthStart(offset)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const monthFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'long' })

/** Название месяца: monthName(1) в сентябре → «октябрь». */
export function monthName(offset = 0): string {
  return monthFormatter.format(monthStart(offset))
}

const longDateFormatter = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

/** «Суббота, 26 сентября» */
export function formatToday(): string {
  const text = longDateFormatter.format(new Date())
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Ближайшая дата стипендии по её числу (как на сервере): строго после сегодняшнего дня. */
export function nextStipendDate(day: number): string {
  const today = new Date()
  const clamp = (year: number, month: number) => Math.min(day, new Date(year, month + 1, 0).getDate())
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), clamp(today.getFullYear(), today.getMonth()))
  if (toISODate(thisMonth) > todayISO()) return toISODate(thisMonth)
  const next = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  return toISODate(new Date(next.getFullYear(), next.getMonth(), clamp(next.getFullYear(), next.getMonth())))
}

/** 1 день, 3 дня, 10 дней. */
export function pluralDays(count: number): string {
  return plural(count, 'день', 'дня', 'дней')
}

export function plural(count: number, one: string, few: string, many: string): string {
  const lastTwo = Math.abs(count) % 100
  const last = Math.abs(count) % 10
  if (lastTwo >= 11 && lastTwo <= 14) return many
  if (last === 1) return one
  if (last >= 2 && last <= 4) return few
  return many
}

/** Число из поля ввода или CSV: «4 200,50» → 4200.5, «−450» → −450. Пустая строка или мусор → NaN. */
export function parseAmount(raw: string): number {
  const normalized = raw
    .replace(/[\s ]/g, '')
    .replace(MINUS, '-')
    .replace(',', '.')
    .replace('₽', '')
  if (normalized === '') return Number.NaN
  return Number(normalized)
}
