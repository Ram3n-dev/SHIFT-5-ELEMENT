// Форматирование сумм и дат для интерфейса. Финансовых формул здесь нет — они на backend.

const moneyFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })
const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
const MINUS = '\u2212'

/** 3400 → «3 400 ₽», −65 → «−65 ₽». */
export function formatRub(value: number): string {
  const sign = value < 0 ? MINUS : ''
  return `${sign}${moneyFormatter.format(Math.abs(value))}\u00A0₽`
}

/** Сумма со знаком: «+2 500 ₽» или «−180 ₽». */
export function formatSignedRub(value: number): string {
  return value > 0 ? `+${formatRub(value)}` : formatRub(value)
}

/** Убирает хвосты вроде 0.30000000000000004 после сложения копеек. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

/** Сегодняшняя дата по часам пользователя в формате ГГГГ-ММ-ДД. */
export function todayISO(): string {
  return toISODate(new Date())
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

/** Та же дата через месяц. 31 января → 28 (29) февраля. */
export function addMonthISO(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const daysInNextMonth = new Date(nextYear, nextMonth, 0).getDate()
  return toISODate(new Date(nextYear, nextMonth - 1, Math.min(day, daysInNextMonth)))
}

export function daysBetween(fromISO: string, toISO: string): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((parseISODate(toISO).getTime() - parseISODate(fromISO).getTime()) / msPerDay)
}

/** «6 октября» */
export function formatDate(iso: string): string {
  return dateFormatter.format(parseISODate(iso))
}

/** 1 день, 3 дня, 10 дней. */
export function pluralDays(count: number): string {
  const lastTwo = Math.abs(count) % 100
  const last = Math.abs(count) % 10
  if (lastTwo >= 11 && lastTwo <= 14) return 'дней'
  if (last === 1) return 'день'
  if (last >= 2 && last <= 4) return 'дня'
  return 'дней'
}

/** Число из поля ввода или CSV: «4 200,50» → 4200.5, «−450» → −450. Пустая строка или мусор → NaN. */
export function parseAmount(raw: string): number {
  const normalized = raw
    .replace(/[\s\u00A0]/g, '')
    .replace(MINUS, '-')
    .replace(',', '.')
  if (normalized === '') return Number.NaN
  return Number(normalized)
}
