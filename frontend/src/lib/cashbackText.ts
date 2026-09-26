// Разбор текста, распознанного со скриншота: категории кэшбэка и партнёрские предложения.
// Распознавание (OCR) может ошибаться, поэтому результат всегда показываем пользователю для проверки.

import { toISODate } from './format'

export interface ParsedCashbackOption {
  name: string
  percent: number
}

export interface ParsedOffer {
  merchant: string
  percent: number
  valid_until: string | null
}

const PERCENT = /(\d{1,2}(?:[.,]\d{1,2})?)\s*%/g
const NOISE = /(выбер|выбра|категори|кэшб[эе]к|кешб[эе]к|готово|сохран|месяц|доступн|осталось|подробнее|назад|отмена|учебный|^до\s)/i
const MAX_OPTIONS = 20

/** Убирает проценты, мусорные символы и лишние пробелы. «• Супермаркеты 5%» → «Супермаркеты». */
function cleanName(text: string): string {
  const cleaned = text
    .replace(PERCENT, ' ')
    .replace(/[^\p{L}\p{N}\s\-«»"'.,&]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[-.,\s]+|[-.,\s]+$/g, '')
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

function isName(text: string): boolean {
  const letters = text.match(/\p{L}/gu)?.length ?? 0
  return letters >= 3 && !NOISE.test(text)
}

function percentsIn(line: string): number[] {
  return [...line.matchAll(PERCENT)]
    .map((match) => Number(match[1].replace(',', '.')))
    .filter((value) => value > 0 && value <= 100)
}

/**
 * Категории кэшбэка. Понимает строки «Супермаркеты 5%», «5% Супермаркеты»,
 * а также процент и название на соседних строках.
 */
export function parseCashbackOptions(text: string): ParsedCashbackOption[] {
  const result: ParsedCashbackOption[] = []
  const seen = new Set<string>()
  let lastName: string | null = null
  let pendingPercent: number | null = null

  const add = (name: string, percent: number) => {
    const key = name.toLowerCase()
    if (!seen.has(key) && result.length < MAX_OPTIONS) {
      seen.add(key)
      result.push({ name, percent })
    }
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '') continue

    const percents = percentsIn(line)
    const name = cleanName(line)

    if (percents.length > 0 && isName(name)) {
      add(name, percents[0])
      lastName = null
      pendingPercent = null
    } else if (percents.length > 0) {
      if (lastName) {
        add(lastName, percents[0])
        lastName = null
      } else {
        pendingPercent = percents[0]
      }
    } else if (isName(name)) {
      if (pendingPercent !== null) {
        add(name, pendingPercent)
        pendingPercent = null
      } else {
        lastName = name
      }
    }
  }

  return result
}

const MONTHS = ['январ', 'феврал', 'март', 'апрел', 'ма', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр']

/** «до 15 октября», «до 15.10», «по 15.10.2026» → дата. Если дата уже прошла в этом году — следующий год. */
export function parseDeadline(text: string, today = new Date()): string | null {
  const numeric = text.match(/(?:до|по)\s+(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?/i)
  const verbal = text.match(/(?:до|по)\s+(\d{1,2})\s+([а-яё]+)/i)

  let day: number
  let month: number
  let year: number | null = null

  if (numeric) {
    day = Number(numeric[1])
    month = Number(numeric[2]) - 1
    if (numeric[3]) year = Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3])
  } else if (verbal) {
    day = Number(verbal[1])
    const word = verbal[2].toLowerCase()
    month = MONTHS.findIndex((prefix) => (prefix === 'ма' ? /^ма[яй]/.test(word) : word.startsWith(prefix)))
    if (month < 0) return null
  } else {
    return null
  }

  if (month < 0 || month > 11 || day < 1 || day > 31) return null

  let date = new Date(year ?? today.getFullYear(), month, day)
  if (year === null && date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    date = new Date(today.getFullYear() + 1, month, day)
  }
  return toISODate(date)
}

/** Партнёрские предложения: «Самокат 10% до 15 октября». Срок может быть на соседней строке. */
export function parseOffers(text: string, today = new Date()): ParsedOffer[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')

  const offers: ParsedOffer[] = []
  lines.forEach((line, index) => {
    const percents = percentsIn(line)
    if (percents.length === 0) return

    const merchant = cleanName(line.replace(/(?:до|по)\s+\d{1,2}(?:[.\s][\p{L}\d.]+)?/giu, ''))
    const previous = lines[index - 1] ?? ''
    const name = isName(merchant) ? merchant : isName(cleanName(previous)) ? cleanName(previous) : ''
    if (name === '') return

    const deadline = parseDeadline(line, today) ?? parseDeadline(lines[index + 1] ?? '', today)
    offers.push({ merchant: name, percent: percents[0], valid_until: deadline })
  })

  return offers.slice(0, MAX_OPTIONS)
}
