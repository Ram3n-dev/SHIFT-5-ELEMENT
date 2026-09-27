import {
  ArrowLeftRight,
  Banknote,
  Briefcase,
  Bus,
  Car,
  Coffee,
  Ellipsis,
  GraduationCap,
<<<<<<< HEAD
  Fuel,
  HeartPulse,
  Landmark,
  Pill,
  Utensils,
=======
  HeartPulse,
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
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
<<<<<<< HEAD
  'Налоги',
=======
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
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
<<<<<<< HEAD
  Налоги: Landmark,
  supermarket: ShoppingCart,
  gas_station: Fuel,
  restaurant: Utensils,
  pharmacy: Pill,
=======
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
  Стипендия: Banknote,
  Подработка: Briefcase,
  Перевод: ArrowLeftRight,
}

export function categoryIcon(category: string): LucideIcon {
  return ICONS[category] ?? Ellipsis
}

<<<<<<< HEAD
/** Подписи категорий, которые приходят из справочника MCC. */
const MCC_LABELS: Record<string, string> = {
  supermarket: 'Супермаркеты',
  gas_station: 'АЗС',
  restaurant: 'Рестораны',
  pharmacy: 'Аптеки',
  uncategorized: 'Без категории',
}

export function categoryTitle(category: string): string {
  return MCC_LABELS[category] ?? category
}

/** Название операции в списке. Текст выписки с контрагентом заменяется категорией. */
export function operationLabel(category: string, description: string): string {
  const blob = `${description} ${category}`.toLowerCase().replaceAll('ё', 'е')
  if (blob.includes('ифнс') || blob.includes('фнс') || blob.includes('налог') || blob.includes('пошлин') || blob.includes('казначей')) {
    return 'Налоги'
  }
  const fromMcc = MCC_LABELS[category] ?? MCC_LABELS[description.trim()]
  if (fromMcc) return fromMcc
  const text = description.trim()
  return text || category
}

=======
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
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
