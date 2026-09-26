import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, CircleHelp, Snowflake } from 'lucide-react'
import Raccoon from '../components/Raccoon'
import { Flame, StreakCelebration, StreakRules, StreakWeek } from '../components/Streak'
import { Button, Card, ErrorNote, IconButton, Segmented, Sheet, Spinner, StatusDot, TileLabel } from '../components/ui'
import { api } from '../lib/api'
import { formatDate, formatRub, formatToday, monthName, pluralDays } from '../lib/format'
import type { Budget, Dashboard, RaccoonPose } from '../lib/types'
import { useApp } from '../state/AppContext'

// Главная в стиле bento: плитки разного размера. Цвет плиток всегда нейтральный —
// состояние показывают Енот, строка текста и маленькая точка.

export default function DashboardPage() {
  const { dashboard, dashboardError, reloadDashboard } = useApp()

  if (!dashboard) {
    return dashboardError ? (
      <div className="flex flex-col items-start gap-3 pt-6">
        <ErrorNote>{dashboardError}</ErrorNote>
        <Button variant="secondary" onClick={() => reloadDashboard()}>
          Обновить
        </Button>
      </div>
    ) : (
      <Spinner />
    )
  }

  return <DashboardView dashboard={dashboard} />
}

function DashboardView({ dashboard }: { dashboard: Dashboard }) {
  const [stipendHidden, setStipendHidden] = useState(false)

  return (
    <div className="flex flex-col gap-3 lg:gap-4">
      <div className="px-1 pt-1 pb-1">
        <h1 className="text-2xl font-bold text-ink lg:text-3xl">Привет, {dashboard.name}</h1>
        <p className="text-sm text-muted">{formatToday()}</p>
      </div>

      {dashboard.stipend.due && !stipendHidden && <StipendDue dashboard={dashboard} onHide={() => setStipendHidden(true)} />}

      {/* Телефон: две колонки. Компьютер: четыре, лимит — большая плитка слева, пустоты заполняет grid-flow-dense. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-flow-dense lg:grid-cols-4 lg:gap-4">
        <LimitTile budget={dashboard.budget} />
        <StipendTile dashboard={dashboard} />
        <PurchaseTile />
        <StreakTile dashboard={dashboard} />
        <TipTile tip={dashboard.tip} />
        <CashbackTile dashboard={dashboard} />
        <PaymentsTile budget={dashboard.budget} />
        <RegionalTile dashboard={dashboard} />
        <AccountsTile dashboard={dashboard} />
      </div>
    </div>
  )
}

function limitPose(budget: Budget): RaccoonPose {
  if (budget.status === 'safe') return 'calm'
  if (budget.free_money <= 0) return 'empty'
  return 'worried'
}

const TONE = { safe: 'ok', warning: 'warn', critical: 'bad' } as const

function LimitTile({ budget }: { budget: Budget }) {
  const { me, setMe, reloadDashboard } = useApp()
  const [saving, setSaving] = useState(false)
  const period = me?.profile.limit_period_days ?? 1
  const days = budget.period_days

  const value = days === 1 ? budget.left_today : budget.left_in_period
  const label = days === 1 ? 'Сегодня можно' : days === 7 ? 'На неделю можно' : `На ${days} ${pluralDays(days)} можно`
  const spentShare = budget.day_limit > 0 ? Math.min(100, (budget.spent_today / budget.day_limit) * 100) : budget.spent_today > 0 ? 100 : 0
  const over = budget.spent_today > budget.day_limit

  const changePeriod = async (value: number) => {
    setSaving(true)
    try {
      setMe(await api.updateProfile({ limit_period_days: value }))
      await reloadDashboard()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="col-span-2 flex flex-col gap-4 lg:row-span-2 lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <TileLabel>{label}</TileLabel>
          <span className="text-5xl leading-none font-extrabold tracking-tight text-ink lg:text-6xl">{formatRub(value)}</span>
          {days > 1 && <span className="text-sm text-muted">≈ {formatRub(budget.day_limit)} в день</span>}
          <span className="mt-2 flex items-center gap-2 text-sm font-medium text-ink">
            <StatusDot tone={TONE[budget.status]} />
            {budget.message}
          </span>
        </div>
        <Raccoon pose={limitPose(budget)} size={88} className="lg:hidden" />
        <Raccoon pose={limitPose(budget)} size={128} className="hidden lg:block" />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="h-2 overflow-hidden rounded-full bg-chip" aria-hidden="true">
          <div className={`h-full rounded-full ${over ? 'bg-bad' : 'bg-ink'}`} style={{ width: `${spentShare}%` }} />
        </div>
        <span className="text-sm text-muted">
          Сегодня потрачено {formatRub(budget.spent_today)} из {formatRub(budget.day_limit)}
        </span>
      </div>

      <Segmented
        label="Период лимита"
        value={period}
        onChange={changePeriod}
        className={saving ? 'opacity-60' : ''}
        options={[
          { value: 1, label: 'День' },
          { value: 3, label: '3 дня' },
          { value: 7, label: 'Неделя' },
        ]}
      />

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span>
          Свободно до стипендии: <b className="font-semibold text-ink">{formatRub(budget.free_money)}</b>
        </span>
        <Link to="/chat?q=why_limit" className="font-semibold text-ink underline-offset-4 hover:underline">
          Почему такой лимит?
        </Link>
      </div>
    </Card>
  )
}

function StipendTile({ dashboard }: { dashboard: Dashboard }) {
  const { stipend } = dashboard
  return (
    <Card className="flex flex-col gap-1">
      <TileLabel>До стипендии</TileLabel>
      <span className="text-3xl font-extrabold text-ink">
        {stipend.days_until} {pluralDays(stipend.days_until)}
      </span>
      <span className="text-sm text-muted">
        {formatDate(stipend.next_date)}
        {stipend.amount > 0 && ` · ${formatRub(stipend.amount)}`}
      </span>
    </Card>
  )
}

function StreakTile({ dashboard }: { dashboard: Dashboard }) {
  const { dataChanged, showToast } = useApp()
  const { streak } = dashboard
  const [rulesOpen, setRulesOpen] = useState(false)
  const [marking, setMarking] = useState(false)
  const [celebrate, setCelebrate] = useState<number | null>(null)
  const closeCelebration = useCallback(() => setCelebrate(null), [])

  const noSpend = async () => {
    setMarking(true)
    try {
      await api.noSpendToday()
      const fresh = await dataChanged()
      if (fresh && fresh.streak.current > streak.current) setCelebrate(fresh.streak.current)
      else showToast({ title: 'День отмечен', text: 'Сегодня без трат — огонёк засчитан.', pose: 'calm' })
    } catch (error) {
      showToast({ title: 'Не получилось', text: error instanceof Error ? error.message : undefined, pose: 'worried' })
    } finally {
      setMarking(false)
    }
  }

  const status = {
    kept: 'Сегодня засчитан',
    over: 'Сегодня перерасход — серия начнётся заново',
    pending: 'Отметь сегодняшний день',
    missed: '',
    frozen: '',
    none: '',
  }[streak.today_status]

  return (
    <Card className="col-span-2 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <TileLabel>Огонёк</TileLabel>
        <IconButton label="Как работает огонёк" size="sm" onClick={() => setRulesOpen(true)} className="-mt-1 -mr-1 text-muted">
          <CircleHelp className="h-4 w-4" />
        </IconButton>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <Flame lit={streak.current > 0} animated={streak.today_status === 'kept'} size={36} />
          <span className="text-4xl font-extrabold text-ink">{streak.current}</span>
          <span className="text-sm leading-tight text-muted">
            {pluralDays(streak.current)}
            <br />
            подряд
          </span>
        </div>
        <div className="min-w-[11rem] flex-1">
          <StreakWeek week={streak.week} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {status && <span className="text-sm text-ink">{status}</span>}
        {streak.today_status === 'pending' && (
          <Button size="sm" variant="secondary" loading={marking} onClick={noSpend}>
            Сегодня без трат
          </Button>
        )}
      </div>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <Snowflake className="h-3.5 w-3.5" aria-hidden="true" />
          {streak.freeze_available ? 'Заморозка есть' : 'Заморозка потрачена'}
        </span>
        <span>Рекорд: {streak.best}</span>
      </span>

      <Sheet open={rulesOpen} onClose={() => setRulesOpen(false)} title="Как работает огонёк">
        <StreakRules />
      </Sheet>
      {celebrate !== null && <StreakCelebration days={celebrate} onClose={closeCelebration} />}
    </Card>
  )
}

function TipTile({ tip }: { tip: string }) {
  return (
    <Card className="col-span-2 flex flex-col gap-3">
      <TileLabel>Совет Енота</TileLabel>
      <p className="text-base leading-relaxed text-ink">{tip}</p>
      <div className="flex flex-wrap gap-2">
        <Link
          to="/chat"
          className="inline-flex h-10 items-center rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink transition hover:brightness-95"
        >
          Спросить Енота
        </Link>
        <Link to="/chat?q=how_to_last" className="inline-flex h-10 items-center rounded-full bg-chip px-4 text-sm font-medium text-ink">
          Как дотянуть до стипендии?
        </Link>
      </div>
    </Card>
  )
}

function PurchaseTile() {
  return (
    <Link to="/purchase" className="group flex flex-col gap-1 rounded-3xl bg-card p-4 transition hover:brightness-[0.98] sm:p-5">
      <TileLabel>Хочу купить</TileLabel>
      <span className="text-lg font-bold text-ink">Хватит ли денег?</span>
      <span className="mt-auto inline-flex items-center gap-1 text-sm text-muted">
        Проверить покупку <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  )
}

function CashbackTile({ dashboard }: { dashboard: Dashboard }) {
  const { cashback } = dashboard
  return (
    <Link to="/cashback" className="group flex flex-col gap-1 rounded-3xl bg-card p-4 transition hover:brightness-[0.98] sm:p-5">
      <TileLabel>Кэшбэк · {cashback.month_name}</TileLabel>
      <span className="text-2xl font-extrabold text-ink">{formatRub(cashback.earned_so_far)}</span>
      <span className="line-clamp-2 text-xs text-muted">
        {cashback.chosen.length > 0 ? cashback.chosen.join(', ') : 'Категории не выбраны'}
      </span>
      <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-medium text-ink">
        {cashback.next_month_ready ? 'Итоги и выбор' : `Выбрать на ${monthName(1)}`}
        <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  )
}

function RegionalTile({ dashboard }: { dashboard: Dashboard }) {
  const { regional } = dashboard
  if (!regional) {
    return (
      <Card className="col-span-2 flex flex-col gap-1">
        <TileLabel>Цены в регионе</TileLabel>
        <p className="text-ink">Укажи город в профиле — покажем, сколько стоит еда в твоём регионе.</p>
        <Link to="/settings" className="text-sm font-semibold text-ink underline-offset-4 hover:underline">
          Открыть профиль
        </Link>
      </Card>
    )
  }

  return (
    <Card className="col-span-2 flex flex-col gap-1">
      <TileLabel>Еда · {regional.is_russia_average ? 'в среднем по России' : regional.region_name}</TileLabel>
      <span className="text-2xl font-extrabold text-ink">≈ {formatRub(regional.food_per_day)} в день</span>
      <span className="text-sm text-muted">
        Минимальный набор продуктов — {formatRub(regional.food_basket_month)} в месяц, {regional.period}. Источник: {regional.source}.
      </span>
      {regional.is_russia_average && <span className="text-xs text-muted">По твоему региону данных пока нет — показываем среднее по России.</span>}
      {dashboard.below_food_minimum && (
        <span className="mt-1 flex items-start gap-2 text-sm text-ink">
          <span className="mt-1.5">
            <StatusDot tone="warn" />
          </span>
          Дневной лимит меньше этой суммы. На еде экономить опасно — проверь обязательные траты и резерв.
        </span>
      )}
    </Card>
  )
}

function PaymentsTile({ budget }: { budget: Budget }) {
  const payments = budget.upcoming_payments.slice(0, 2)
  return (
    <Card className="flex flex-col gap-2">
      <TileLabel>Скоро платежи</TileLabel>
      {payments.length === 0 ? (
        <p className="text-sm text-muted">Регулярных платежей до стипендии нет.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {payments.map((payment) => (
            <li key={payment.id} className="flex flex-col">
              <span className="truncate font-medium text-ink">{payment.name}</span>
              <span className="text-sm text-muted">
                {formatRub(payment.amount)} · {formatDate(payment.next_date)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link to="/settings#recurring" className="mt-auto text-sm font-semibold text-ink underline-offset-4 hover:underline">
        Все платежи
      </Link>
    </Card>
  )
}

function AccountsTile({ dashboard }: { dashboard: Dashboard }) {
  return (
    <Card className="col-span-2 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <TileLabel>Счета</TileLabel>
        <span className="text-sm text-muted">Всего {formatRub(dashboard.budget.total_balance)}</span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-3">
        {dashboard.accounts.map((account) => (
          <li key={account.id} className="flex flex-col rounded-2xl bg-chip px-3 py-2">
            <span className="text-sm text-muted">{account.name}</span>
            <span className="font-bold text-ink">{formatRub(account.balance)}</span>
            {!account.include_in_spending && <span className="text-xs text-muted">не входит в лимит</span>}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function StipendDue({ dashboard, onHide }: { dashboard: Dashboard; onHide: () => void }) {
  const { dataChanged, showToast } = useApp()
  const [saving, setSaving] = useState(false)
  const card = dashboard.accounts.find((account) => account.type === 'card') ?? dashboard.accounts[0]

  const confirm = async () => {
    setSaving(true)
    try {
      await api.stipendReceived(card?.id ?? null)
      await dataChanged()
      showToast({ title: 'Стипендия пришла!', text: 'Начинаем новый период — Енот пересчитал лимит.', pose: 'celebrate' })
    } catch (error) {
      showToast({ title: 'Не получилось', text: error instanceof Error ? error.message : undefined, pose: 'worried' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Raccoon pose="celebrate" size={64} />
      <div className="flex-1">
        <p className="font-bold text-ink">Стипендия пришла?</p>
        <p className="text-sm text-muted">
          По расписанию — {formatDate(dashboard.stipend.due_date)}. Отметь, и Енот добавит {formatRub(dashboard.stipend.amount)}
          {card ? ` на «${card.name}»` : ''} и начнёт новый период.
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" loading={saving} onClick={confirm}>
          Пришла
        </Button>
        <Button size="sm" variant="secondary" onClick={onHide}>
          Ещё нет
        </Button>
      </div>
    </Card>
  )
}
