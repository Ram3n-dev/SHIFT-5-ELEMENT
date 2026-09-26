import type { OperationType } from '../types'

export const EXPENSE_CATEGORIES = [
  'Еда',
  'Транспорт',
  'Учёба',
  'Связь',
  'Подписки',
  'Здоровье',
  'Развлечения',
  'Другое',
] as const

export const INCOME_CATEGORIES = ['Стипендия', 'Подработка', 'Перевод', 'Другое'] as const

export const OTHER_CATEGORY = 'Другое'

export function categoriesFor(type: OperationType): readonly string[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
}

/**
 * Находит категорию из списка без учёта регистра и буквы «ё».
 * «учеба» → «Учёба». Если такой категории нет — null.
 */
export function matchCategory(raw: string, type: OperationType): string | null {
  const simplify = (value: string) => value.trim().toLowerCase().replaceAll('ё', 'е')
  const wanted = simplify(raw)
  return categoriesFor(type).find((category) => simplify(category) === wanted) ?? null
}
