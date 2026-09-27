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

<<<<<<< HEAD
const PERCENT_SOURCE = String.raw`(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:%|％|проц(?:ент(?:а|ов)?)?|(?:°|o|о|0)\s*/\s*(?:o|о|0))`

function percentPattern() {
  return new RegExp(PERCENT_SOURCE, 'gi')
}
=======
const PERCENT = /(\d{1,2}(?:[.,]\d{1,2})?)\s*%/g
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
const NOISE = /(выбер|выбра|категори|кэшб[эе]к|кешб[эе]к|готово|сохран|месяц|доступн|осталось|подробнее|назад|отмена|учебный|^до\s)/i
const MAX_OPTIONS = 20

/** Убирает проценты, мусорные символы и лишние пробелы. «• Супермаркеты 5%» → «Супермаркеты». */
function cleanName(text: string): string {
  const cleaned = text
<<<<<<< HEAD
    .replace(percentPattern(), ' ')
=======
    .replace(PERCENT, ' ')
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
    .replace(/[^\p{L}\p{N}\s\-«»"'.,&]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[-.,\s]+|[-.,\s]+$/g, '')
<<<<<<< HEAD
  if (cleaned === '') return ''
=======
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

function isName(text: string): boolean {
  const letters = text.match(/\p{L}/gu)?.length ?? 0
  return letters >= 3 && !NOISE.test(text)
}

function percentsIn(line: string): number[] {
<<<<<<< HEAD
  return [...line.matchAll(percentPattern())]
=======
  return [...line.matchAll(PERCENT)]
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
    .map((match) => Number(match[1].replace(',', '.')))
    .filter((value) => value > 0 && value <= 100)
}

<<<<<<< HEAD
const KNOWN_CATEGORIES = [
  'Супермаркеты',
  'Рестораны',
  'Фастфуд',
  'Аптеки',
  'Такси',
  'Транспорт',
  'АЗС',
  'Кино',
  'Развлечения',
  'Цветы',
  'Дом и ремонт',
  'Красота',
  'Одежда и обувь',
  'Одежда',
  'Связь',
  'ЖКХ',
  'Образование',
  'Спорт',
  'Зоотовары',
  'Электроника',
  'Маркетплейсы',
  'Путешествия',
  'Книги',
  'Цифровые товары',
  'Все покупки',
  'Автоуслуги',
  'Детские товары',
]

/** Несколько пар «название + процент» на одной строке: так OCR читает сетку категорий. */
function pairsInLine(line: string): ParsedCashbackOption[] {
  const pattern = percentPattern()
  const matches = [...line.matchAll(pattern)]
  if (matches.length === 0) return []

  const parts: { kind: 'text' | 'percent'; text: string; value?: number }[] = []
  let cursor = 0
  for (const match of matches) {
    const index = match.index ?? 0
    const before = line.slice(cursor, index)
    if (before.trim() !== '') parts.push({ kind: 'text', text: before })
    parts.push({ kind: 'percent', text: match[0], value: Number(match[1].replace(',', '.')) })
    cursor = index + match[0].length
  }
  const tail = line.slice(cursor)
  if (tail.trim() !== '') parts.push({ kind: 'text', text: tail })

  const pairs: ParsedCashbackOption[] = []
  const used = new Set<number>()
  parts.forEach((part, index) => {
    if (part.kind !== 'percent' || part.value === undefined || part.value <= 0 || part.value > 100) return
    const previousIndex = index - 1
    const nextIndex = index + 1
    const previousPart = parts[previousIndex]
    const nextPart = parts[nextIndex]
    const previousName = previousPart?.kind === 'text' ? cleanName(previousPart.text) : ''
    const nextName = nextPart?.kind === 'text' ? cleanName(nextPart.text) : ''
    if (isName(previousName) && !used.has(previousIndex)) {
      used.add(previousIndex)
      pairs.push({ name: previousName, percent: part.value })
    } else if (isName(nextName) && !used.has(nextIndex)) {
      used.add(nextIndex)
      pairs.push({ name: nextName, percent: part.value })
    }
  })
  return pairs
}

function recoverKnown(text: string, result: ParsedCashbackOption[], seen: Set<string>) {
  const flat = text.replace(/\s+/g, ' ')
  const lower = flat.toLowerCase()
  for (const name of KNOWN_CATEGORIES) {
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    const index = lower.indexOf(key)
    if (index < 0) continue
    const window = flat.slice(Math.max(0, index - 16), index + name.length + 16)
    const labeled = percentsIn(window)[0]
    const bare = window.match(/(?:^|[^\d])(\d{1,2}(?:[.,]\d{1,2})?)(?:[^\d]|$)/)
    const bareValue = bare ? Number(bare[1].replace(',', '.')) : NaN
    const percent = labeled ?? (bareValue > 0 && bareValue <= 30 ? bareValue : NaN)
    if (!Number.isFinite(percent)) continue
    seen.add(key)
    result.push({ name, percent })
  }
}

=======
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
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
<<<<<<< HEAD
    if (!seen.has(key) && result.length < MAX_OPTIONS && percent > 0 && percent <= 100) {
=======
    if (!seen.has(key) && result.length < MAX_OPTIONS) {
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
      seen.add(key)
      result.push({ name, percent })
    }
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '') continue

<<<<<<< HEAD
    const pairs = pairsInLine(line)
    if (pairs.length > 0) {
      pairs.forEach((pair) => add(pair.name, pair.percent))
      lastName = null
      pendingPercent = null
      continue
    }

    const percents = percentsIn(line)
    const name = cleanName(line)

    if (percents.length > 0) {
=======
    const percents = percentsIn(line)
    const name = cleanName(line)

    if (percents.length > 0 && isName(name)) {
      add(name, percents[0])
      lastName = null
      pendingPercent = null
    } else if (percents.length > 0) {
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
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

<<<<<<< HEAD
  recoverKnown(text, result, seen)
  return result.slice(0, MAX_OPTIONS)
=======
  return result
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
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
