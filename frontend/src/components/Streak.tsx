import { useEffect } from 'react'
import { formatWeekday, pluralDays } from '../lib/format'
import type { DayStatus, StreakDay } from '../lib/types'
import Raccoon from './Raccoon'
import { Button } from './ui'

// Огонёк — серия дней в пределах лимита, как в Duolingo. Правила считает сервер (StreakCalculator).

export function Flame({ lit, size = 28, animated = lit }: { lit: boolean; size?: number; animated?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <g className={animated ? 'flame' : undefined}>
        <path
          d="M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-3 1.5-4.5 2.5-6 .5 2 1.5 3 2.5 3-1-3 0-6 0-8z"
          fill={lit ? '#FFB020' : 'var(--lp-line)'}
        />
        {lit && <path d="M12 12.5c.6 1.8 2.3 2.4 2.3 4.6a2.3 2.3 0 0 1-4.6 0c0-1.3.7-2 1.2-2.8.3.8.7 1.3 1.1 1.3-.4-1.3 0-2.4 0-3.1z" fill="#FFDD2D" />}
      </g>
    </svg>
  )
}

const DAY_STYLE: Record<DayStatus, string> = {
  kept: 'bg-accent',
  frozen: 'bg-muted',
  over: 'bg-bad',
  missed: 'bg-line',
  pending: 'border border-dashed border-muted',
  none: 'bg-chip',
}

export const DAY_TEXT: Record<DayStatus, string> = {
  kept: 'засчитан',
  frozen: 'выручила заморозка',
  over: 'перерасход',
  missed: 'пропущен',
  pending: 'ещё не отмечен',
  none: 'до начала',
}

/** Последние 7 дней полосками: жёлтая — засчитан, серая — заморозка, красная — перерасход. */
export function StreakWeek({ week }: { week: StreakDay[] }) {
  return (
    <ol className="flex gap-1" aria-label="Последние 7 дней">
      {week.map((day) => (
        <li key={day.date} className="flex flex-1 flex-col items-center gap-1" title={`${formatWeekday(day.date)}: ${DAY_TEXT[day.status]}`}>
          <span className={`h-1.5 w-full rounded-full ${DAY_STYLE[day.status]}`} aria-hidden="true" />
          <span className="text-[10px] text-muted">{formatWeekday(day.date)}</span>
          <span className="sr-only">{DAY_TEXT[day.status]}</span>
        </li>
      ))}
    </ol>
  )
}

/** Правила огонька — открываются по кнопке «?» на плитке. */
export function StreakRules() {
  const rules = [
<<<<<<< HEAD
    'День засчитан, когда ты заходишь в приложение. Огонёк растёт за каждый такой день подряд.',
    'Пропустил день? Раз в 7 дней выручает заморозка — серия сохранится.',
    'Если сегодня ещё не открывал приложение, огонёк не гаснет до конца дня.',
=======
    'День засчитан, если ты его отметил — записал траты или нажал «Сегодня без трат» — и уложился в лимит дня.',
    'Перерасход обнуляет серию. Не страшно: завтра можно начать заново, а лимит Енот пересчитает.',
    'Пропустил день? Раз в 7 дней выручает заморозка — серия сохранится.',
    'Пока сегодняшний день не отмечен, огонёк не гаснет: время есть до конца дня.',
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
  ]
  const legend: DayStatus[] = ['kept', 'frozen', 'over', 'missed', 'pending']

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-3">
        {rules.map((rule, index) => (
          <li key={rule} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-ink">
              {index + 1}
            </span>
            <span className="text-ink">{rule}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-2 rounded-2xl bg-card p-4">
        {legend.map((status) => (
          <span key={status} className="flex items-center gap-3 text-sm text-ink">
            <span className={`h-1.5 w-8 rounded-full ${DAY_STYLE[status]}`} aria-hidden="true" />
            {DAY_TEXT[status]}
          </span>
        ))}
      </div>
    </div>
  )
}

const CONFETTI_COLORS = ['#FFDD2D', '#1C1C1E', '#A4A6AB', '#FFB020']

/** Праздник, когда серия выросла: большой огонёк, Енот радуется, конфетти. */
export function StreakCelebration({ days, onClose }: { days: number; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 4500)
    return () => window.clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label="Серия выросла">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="pop-in relative flex w-full max-w-sm flex-col items-center gap-3 overflow-hidden rounded-3xl bg-card px-6 pt-8 pb-6 text-center">
        {Array.from({ length: 18 }, (_, index) => (
          <span
            key={index}
            className="confetti-piece"
            style={{
              left: `${(index * 53) % 100}%`,
              background: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
              animationDelay: `${(index % 6) * 0.12}s`,
            }}
            aria-hidden="true"
          />
        ))}
        <div className="flex items-end gap-1">
          <Raccoon pose="celebrate" size={110} />
          <Flame lit size={56} />
        </div>
        <p className="text-4xl font-extrabold text-ink">
          {days} {pluralDays(days)}
        </p>
        <p className="text-muted">подряд в пределах лимита. Так держать!</p>
        <Button onClick={onClose} className="mt-2 w-full">
          Отлично
        </Button>
      </div>
    </div>
  )
}
