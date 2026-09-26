import {
  ArrowLeftRight,
  Banknote,
  Briefcase,
  Bus,
  Car,
  Coffee,
  Ellipsis,
  GraduationCap,
  HeartPulse,
  Shirt,
  ShoppingCart,
  Smartphone,
  Ticket,
  Tv,
  type LucideIcon,
} from 'lucide-react'
import type { OperationType } from './types'

// Категории операций. Такие же списки есть на backend (Logic/Categories.cs).

export const EXPENSE_CATEGORIES = [
  'Продукты',
  'Кафе и доставка',
  'Транспорт',
  'Такси',
  'Учёба',
  'Связь',
  'Подписки',
  'Здоровье',
  'Развлечения',
  'Одежда',
  'Другое',
] as const

export const INCOME_CATEGORIES = ['Стипендия', 'Подработка', 'Перевод', 'Другое'] as const

export const OTHER_CATEGORY = 'Другое'

/** «Все покупки» для кэшбэка вида «1% на всё». */
export const ALL_PURCHASES = '*'

const ICONS: Record<string, LucideIcon> = {
  Продукты: ShoppingCart,
  'Кафе и доставка': Coffee,
  Транспорт: Bus,
  Такси: Car,
  Учёба: GraduationCap,
  Связь: Smartphone,
  Подписки: Tv,
  Здоровье: HeartPulse,
  Развлечения: Ticket,
  Одежда: Shirt,
  Стипендия: Banknote,
  Подработка: Briefcase,
  Перевод: ArrowLeftRight,
}

export function categoryIcon(category: string): LucideIcon {
  return ICONS[category] ?? Ellipsis
}

export function categoriesFor(type: OperationType): readonly string[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
}

// Старые названия из первой версии и CSV-выписок.
const ALIASES: Record<string, string> = { еда: 'Продукты', кафе: 'Кафе и доставка', доставка: 'Кафе и доставка' }

/**
 * Находит категорию из списка без учёта регистра и буквы «ё».
 * «учеба» → «Учёба», «Еда» → «Продукты». Если такой категории нет — null.
 */
export function matchCategory(raw: string, type: OperationType): string | null {
  const simplify = (value: string) => value.trim().toLowerCase().replaceAll('ё', 'е')
  const wanted = simplify(raw)
  const direct = categoriesFor(type).find((category) => simplify(category) === wanted)
  if (direct) return direct
  return type === 'expense' ? (ALIASES[wanted] ?? null) : null
}
