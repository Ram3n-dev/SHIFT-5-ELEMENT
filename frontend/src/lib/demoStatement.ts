import { toISODate } from './format'
import type { OperationInput } from './types'

const EXPENSES = [
  { category: 'supermarket', min: 180, max: 4200 },
  { category: 'gas_station', min: 1200, max: 4800 },
  { category: 'restaurant', min: 250, max: 2600 },
  { category: 'pharmacy', min: 120, max: 1600 },
  { category: 'uncategorized', min: 90, max: 2200 },
  { category: 'Продукты', min: 200, max: 3500 },
  { category: 'Кафе и доставка', min: 250, max: 1800 },
  { category: 'Транспорт', min: 40, max: 800 },
  { category: 'Такси', min: 180, max: 900 },
  { category: 'Налоги', min: 150, max: 2500 },
] as const

const INCOMES = [
  { category: 'Стипендия', min: 4000, max: 20000 },
  { category: 'Подработка', min: 1500, max: 9000 },
  { category: 'Перевод', min: 200, max: 6000 },
] as const

/** 15 операций, похожих на учебную выгрузку из банковского API. */
export function demoStatement(accountId: string, count = 15): OperationInput[] {
  const today = new Date()
  return Array.from({ length: count }, () => {
    const income = Math.random() < 0.28
    const sample = income ? pick(INCOMES) : pick(EXPENSES)
    const date = new Date(today)
    date.setDate(date.getDate() - randomInt(0, 27))
    return {
      type: income ? 'income' : 'expense',
      amount: randomMoney(sample.min, sample.max),
      category: sample.category,
      description: sample.category,
      account_id: accountId,
      date: toISODate(date),
      is_mandatory: false,
    }
  })
}

function pick<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)]
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function randomMoney(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100
}
