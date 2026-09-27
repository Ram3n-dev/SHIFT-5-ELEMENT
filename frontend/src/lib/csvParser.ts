// Разбор учебной CSV-выписки. Файл читается и разбирается в браузере — на сервер уходят только готовые операции.
//
// Формат:
// date,description,amount,category
// 2026-09-25,Стипендия,2500,Стипендия
// 2026-09-26,Продукты,-450,Еда
//
// amount > 0 — доход, amount < 0 — расход. Разделитель — запятая или точка с запятой.

import type { OperationType } from './types'
import { OTHER_CATEGORY, matchCategory } from './categories'
import { isValidISODate, parseAmount } from './format'

export const REQUIRED_COLUMNS = ['date', 'description', 'amount', 'category'] as const
export const MAX_FILE_SIZE_BYTES = 1024 * 1024
const MAX_ROWS = 1000

export interface ParsedOperation {
  date: string
  description: string
  /** Всегда положительная сумма. */
  amount: number
  type: OperationType
  category: string
}

export interface CsvError {
  /** Номер строки в файле (заголовок — строка 1). 0 — ошибка файла целиком. */
  line: number
  message: string
}

export interface CsvParseResult {
  operations: ParsedOperation[]
  errors: CsvError[]
  /** Сколько операций с неизвестной категорией отнесено к «Другое». */
  unknownCategoryCount: number
}

export function parseCsv(text: string): CsvParseResult {
  const result: CsvParseResult = { operations: [], errors: [], unknownCategoryCount: 0 }

  const lines = text
    .replace(/^\uFEFF/, '') // BOM из Excel
    .split(/\r?\n/)
    .map((line, index) => ({ text: line, number: index + 1 }))
    .filter((line) => line.text.trim() !== '')

  if (lines.length === 0) {
    result.errors.push({ line: 0, message: 'Файл пустой.' })
    return result
  }

  const header = lines[0]
  const delimiter = header.text.split(';').length > header.text.split(',').length ? ';' : ','
  const columns = splitLine(header.text, delimiter).map((cell) => cell.toLowerCase())

  const missing = REQUIRED_COLUMNS.filter((column) => !columns.includes(column))
  if (missing.length > 0) {
    result.errors.push({
      line: header.number,
      message: `Нет колонок: ${missing.join(', ')}. Первая строка должна быть такой: ${REQUIRED_COLUMNS.join(',')}`,
    })
    return result
  }

  const dataLines = lines.slice(1)
  if (dataLines.length === 0) {
    result.errors.push({ line: 0, message: 'В файле нет операций — только заголовок.' })
    return result
  }
  if (dataLines.length > MAX_ROWS) {
    result.errors.push({ line: 0, message: `Слишком много строк: максимум ${MAX_ROWS} операций за один импорт.` })
    return result
  }

  const index = {
    date: columns.indexOf('date'),
    description: columns.indexOf('description'),
    amount: columns.indexOf('amount'),
    category: columns.indexOf('category'),
  }

  for (const line of dataLines) {
    const cells = splitLine(line.text, delimiter)
    const date = cells[index.date] ?? ''
    const description = cells[index.description] ?? ''
    const rawAmount = cells[index.amount] ?? ''
    const rawCategory = cells[index.category] ?? ''

    if (!isValidISODate(date)) {
      result.errors.push({ line: line.number, message: `дата «${date}» должна быть в формате ГГГГ-ММ-ДД` })
      continue
    }

    const amount = parseAmount(rawAmount)
    if (!Number.isFinite(amount)) {
      result.errors.push({ line: line.number, message: `сумма «${rawAmount}» не число` })
      continue
    }
    if (amount === 0) {
      result.errors.push({ line: line.number, message: 'сумма не может быть равна нулю' })
      continue
    }

    const type: OperationType = amount > 0 ? 'income' : 'expense'
    const category = matchCategory(rawCategory, type)
    if (category === null) result.unknownCategoryCount += 1

    result.operations.push({
      date,
      description: description || rawCategory || 'Без описания',
      amount: Math.abs(amount),
      type,
      category: category ?? OTHER_CATEGORY,
    })
  }

  return result
}

/** Делит строку на ячейки. Поддерживает значения в кавычках: "Кафе, бар" или "Книга ""1984""". */
function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  cells.push(current.trim())
  return cells
}

/** Читает файл как UTF-8, а если не получилось — как Windows-1251 (так сохраняет русский Excel). */
export async function readCsvFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    return new TextDecoder('windows-1251').decode(buffer)
  }
}
