import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
<<<<<<< HEAD
import { ChevronLeft, Plus, X } from 'lucide-react'
import CityPicker, { type CityValue } from '../components/CityPicker'
import Raccoon from '../components/Raccoon'
import { Button, Chip, ErrorNote, MoneyInput, TextInput } from '../components/ui'
=======
import { ChevronLeft } from 'lucide-react'
import CityPicker, { type CityValue } from '../components/CityPicker'
import Raccoon from '../components/Raccoon'
import { Button, Chip, ErrorNote, MoneyInput } from '../components/ui'
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
import { api } from '../lib/api'
import { formatDate, formatRub, nextStipendDate, parseAmount, pluralDays } from '../lib/format'
import type { Dashboard, Me, RaccoonPose } from '../lib/types'
import { useApp } from '../state/AppContext'

// Первый вход в стиле Down Dog: по одному вопросу на экран. В конце Енот пересчитывает деньги и показывает лимит.

type Step = 'hello' | 'city' | 'stipend' | 'day' | 'money' | 'mandatory' | 'reserve' | 'period' | 'result'
const STEPS: Step[] = ['hello', 'city', 'stipend', 'day', 'money', 'mandatory', 'reserve', 'period', 'result']
const QUESTIONS = STEPS.length - 2

interface MandatoryItem {
  name: string
  amount: string
  on: boolean
<<<<<<< HEAD
  custom?: boolean
=======
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
}

const MANDATORY_DEFAULTS: MandatoryItem[] = [
  { name: 'Общежитие или аренда', amount: '1500', on: false },
  { name: 'Проезд', amount: '1000', on: false },
  { name: 'Связь и интернет', amount: '500', on: false },
  { name: 'Подписки', amount: '300', on: false },
  { name: 'Учёба: печать, материалы', amount: '300', on: false },
]

const PERIODS = [
  { value: 1, title: 'На день', text: 'Сколько можно потратить сегодня. Проще всего следить.' },
  { value: 3, title: 'На 3 дня', text: 'Удобно, если тратишь неравномерно: сегодня меньше, завтра больше.' },
  { value: 7, title: 'На неделю', text: 'Одна сумма на 7 дней вперёд.' },
]

const MIN_COUNTING_MS = 1800

export default function OnboardingPage() {
  const { setMe } = useApp()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('hello')
  const [consent, setConsent] = useState(false)
  const [city, setCity] = useState<CityValue>({ city: null, regionCode: null, regionName: null })
  const [stipend, setStipend] = useState('')
  const [stipendDay, setStipendDay] = useState(25)
  const [card, setCard] = useState('')
  const [cash, setCash] = useState('')
  const [savings, setSavings] = useState('')
  const [mandatory, setMandatory] = useState<MandatoryItem[]>(MANDATORY_DEFAULTS)
<<<<<<< HEAD
  const [customName, setCustomName] = useState('')
  const [customAmount, setCustomAmount] = useState('')
=======
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
  const [reserve, setReserve] = useState(0)
  const [period, setPeriod] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ me: Me; dashboard: Dashboard } | null>(null)

  const index = STEPS.indexOf(step)
  const amount = (value: string) => (value.trim() === '' ? 0 : parseAmount(value))
  const mandatoryTotal = mandatory.filter((item) => item.on).reduce((sum, item) => sum + (amount(item.amount) || 0), 0)
  const moneyNow = [card, cash].map(amount).reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0)
  const reserveMax = Math.max(2000, Math.floor((moneyNow * 0.5) / 100) * 100)

  const go = (next: Step) => {
    setError(null)
    setStep(next)
  }

  const submit = async (values: {
    city: CityValue
    stipend: number
    stipendDay: number
    card: number
    cash: number
    savings: number
    mandatory: number
    reserve: number
    period: number
  }) => {
    setError(null)
    setResult(null)
    setStep('result')
    const started = Date.now()
    try {
      const me = await api.onboarding({
        pd_consent: true,
        city: values.city.city,
        region_code: values.city.regionCode,
        stipend_amount: values.stipend,
        stipend_day: values.stipendDay,
        card: values.card,
        cash: values.cash,
        savings: values.savings,
        mandatory_monthly: values.mandatory,
        reserve: values.reserve,
        limit_period_days: values.period,
      })
      const dashboard = await api.dashboard()
      // Даём Еноту досчитать деньги — анимация не должна мелькать.
      await new Promise((resolve) => window.setTimeout(resolve, Math.max(0, MIN_COUNTING_MS - (Date.now() - started))))
      setResult({ me, dashboard })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить ответы.')
    }
  }

  const finish = () => {
    if (!result) return
    setMe(result.me)
    navigate('/dashboard', { replace: true })
  }

<<<<<<< HEAD
  const addCustom = () => {
    const name = customName.trim()
    if (name.length < 2) {
      setError('Напиши название своей категории.')
      return
    }
    if (mandatory.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      setError('Такая категория уже есть.')
      return
    }
    setError(null)
    setMandatory((list) => [...list, { name, amount: customAmount.trim() === '' ? '0' : customAmount, on: true, custom: true }])
    setCustomName('')
    setCustomAmount('')
  }

=======
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
  const next = () => {
    switch (step) {
      case 'hello':
        return consent ? go('city') : setError('Нужно согласие на обработку данных — без него Енот не сможет посчитать бюджет.')
      case 'city':
        return go('stipend')
      case 'stipend': {
        const value = amount(stipend)
        return Number.isFinite(value) && value >= 0 ? go('day') : setError('Введи сумму числом, например 3500.')
      }
      case 'day':
        return go('money')
      case 'money': {
        const values = [card, cash, savings].map(amount)
        if (values.some((value) => !Number.isFinite(value))) return setError('Суммы — числами, например 4200.')
        if (values[1] < 0 || values[2] < 0) return setError('Наличные и накопления не могут быть меньше нуля.')
        return go('mandatory')
      }
      case 'mandatory':
<<<<<<< HEAD
        if (customName.trim() !== '') {
          const name = customName.trim()
          if (name.length < 2) return setError('Напиши название своей категории.')
          if (!mandatory.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
            setMandatory((list) => [...list, { name, amount: customAmount.trim() === '' ? '0' : customAmount, on: true, custom: true }])
          }
        }
=======
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
        return go('reserve')
      case 'reserve':
        return go('period')
      case 'period':
        return submit({
          city,
          stipend: amount(stipend),
          stipendDay,
          card: amount(card),
          cash: amount(cash),
          savings: amount(savings),
          mandatory: mandatoryTotal,
          reserve,
          period,
        })
    }
  }

  // Для показа на защите: заполнить типичными ответами студента и сразу посчитать.
  const fillExample = () => {
    if (!consent) {
      setError('Сначала отметь согласие на обработку данных.')
      return
    }
    submit({
      city: { city: 'Красноярск', regionCode: '24', regionName: 'Красноярский край' },
      stipend: 3500,
      stipendDay: 25,
      card: 4200,
      cash: 500,
      savings: 2000,
      mandatory: 2400,
      reserve: 500,
      period: 1,
    })
  }

  return (
    <div className="flex min-h-screen flex-col bg-page">
      {step !== 'result' && (
        <div className="mx-auto flex w-full max-w-xl items-center gap-3 px-4 pt-4">
          <button
            type="button"
            onClick={() => go(STEPS[index - 1])}
            disabled={index === 0}
            aria-label="Назад"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-ink disabled:invisible"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-chip" aria-hidden="true">
            <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${(index / QUESTIONS) * 100}%` }} />
          </div>
          <span className="w-12 text-right text-sm text-muted">{index > 0 ? `${index} из ${QUESTIONS}` : ''}</span>
        </div>
      )}

      <form
        className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pt-6 pb-6"
        onSubmit={(event) => {
          event.preventDefault()
          next()
        }}
      >
        <div key={step} className="step-in flex flex-1 flex-col gap-5">
          {step === 'hello' && (
            <Question pose="hello" title="Привет! Я Енот" text="Помогу дотянуть до стипендии: посчитаю лимит на каждый день и подскажу, какой кэшбэк выбрать. 7 коротких вопросов — и готово.">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-card p-4">
                <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" style={{ accentColor: 'var(--lp-ink)' }} checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                <span className="text-sm text-ink">
<<<<<<< HEAD
                  Согласен на обработку данных, которые введу, чтобы Енотономика считала мой бюджет.{' '}
=======
                  Согласен на обработку данных, которые введу, чтобы Лимит+ считал мой бюджет.{' '}
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
                  <a href="/privacy" target="_blank" rel="noreferrer" className="font-medium underline">
                    Подробнее
                  </a>
                </span>
              </label>
              <p className="text-sm text-muted">Только учебные данные: не вводи реальные пароли, номера карт и коды из SMS.</p>
            </Question>
          )}

          {step === 'city' && (
            <Question pose="think" title="В каком ты городе?" text="Покажу, сколько стоит минимальный набор продуктов в твоём регионе по данным Росстата.">
              <CityPicker value={city} onChange={setCity} />
            </Question>
          )}

          {step === 'stipend' && (
            <Question pose="count" title="Сколько приходит стипендия?" text="Или другой регулярный доход: перевод от родителей, подработка.">
              <MoneyInput big autoFocus placeholder="0" value={stipend} onChange={setStipend} aria-label="Размер стипендии" />
              <div className="flex flex-wrap gap-2">
                {[0, 3000, 5000, 8000, 12000].map((value) => (
                  <Chip key={value} active={amount(stipend) === value && stipend !== ''} onClick={() => setStipend(String(value))}>
                    {value === 0 ? 'Нет стипендии' : formatRub(value)}
                  </Chip>
                ))}
              </div>
            </Question>
          )}

          {step === 'day' && (
            <Question pose="calm" title="Какого числа она приходит?" text={`Следующая будет ${formatDate(nextStipendDate(stipendDay))}.`}>
              <div className="grid grid-cols-7 gap-2" role="radiogroup" aria-label="Число месяца">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <button
                    key={day}
                    type="button"
                    role="radio"
                    aria-checked={day === stipendDay}
                    onClick={() => setStipendDay(day)}
                    className={`h-11 rounded-2xl text-base font-semibold transition ${day === stipendDay ? 'bg-accent text-accent-ink' : 'bg-card text-ink hover:bg-chip'}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted">Если в месяце нет такого числа (например, 31-го), возьмём последний день месяца.</p>
            </Question>
          )}

          {step === 'money' && (
            <Question pose="count" title="Сколько денег у тебя сейчас?" text="Енот пересчитает всё вместе. Накопления в лимит не входят — это на цели.">
              <MoneyRow label="На карте" value={card} onChange={setCard} autoFocus />
              <MoneyRow label="Наличными" value={cash} onChange={setCash} />
              <MoneyRow label="Накопления" value={savings} onChange={setSavings} />
            </Question>
          )}

          {step === 'mandatory' && (
            <Question pose="think" title="Обязательные траты в месяц" text="То, что точно придётся оплатить. Эти деньги Енот отложит, и они не попадут в дневной лимит.">
              <div className="flex flex-col gap-2">
                {mandatory.map((item, i) => (
<<<<<<< HEAD
                  <div key={`${item.name}-${i}`} className={`flex items-center gap-3 rounded-2xl p-2 pl-4 transition ${item.on ? 'bg-card' : 'bg-chip'}`}>
=======
                  <div key={item.name} className={`flex items-center gap-3 rounded-2xl p-2 pl-4 transition ${item.on ? 'bg-card' : 'bg-chip'}`}>
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
                    <label className="flex flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-5 w-5 shrink-0" style={{ accentColor: 'var(--lp-ink)' }}
                        checked={item.on}
                        onChange={(event) => setMandatory((list) => list.map((row, j) => (j === i ? { ...row, on: event.target.checked } : row)))}
                      />
                      <span className="text-ink">{item.name}</span>
                    </label>
                    <div className="w-32">
                      <MoneyInput
                        aria-label={`${item.name}, сумма`}
                        value={item.amount}
                        onChange={(value) => setMandatory((list) => list.map((row, j) => (j === i ? { ...row, amount: value, on: true } : row)))}
                      />
                    </div>
<<<<<<< HEAD
                    {item.custom && (
                      <button
                        type="button"
                        aria-label={`Удалить категорию ${item.name}`}
                        onClick={() => setMandatory((list) => list.filter((_, j) => j !== i))}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-chip"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2 rounded-2xl bg-card p-3">
                <p className="text-sm font-medium text-ink">Своя категория</p>
                <div className="flex flex-wrap items-center gap-2">
                  <TextInput
                    aria-label="Название своей категории"
                    placeholder="Например, спортзал"
                    maxLength={40}
                    className="min-w-0 flex-1"
                    value={customName}
                    onChange={(event) => setCustomName(event.target.value)}
                  />
                  <div className="w-32">
                    <MoneyInput aria-label="Сумма своей категории" value={customAmount} onChange={setCustomAmount} />
                  </div>
                  <Button type="button" variant="secondary" onClick={addCustom}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Добавить
                  </Button>
                </div>
              </div>
=======
                  </div>
                ))}
              </div>
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
              <p className="text-lg text-ink">
                Итого: <b>{formatRub(mandatoryTotal)}</b> в месяц
              </p>
            </Question>
          )}

          {step === 'reserve' && (
            <Question pose="calm" title="Сколько оставить в резерве?" text="Деньги на непредвиденное: заболел, сломался телефон. Их Енот не трогает и в лимит не считает.">
              <p className="text-5xl font-extrabold text-ink">{formatRub(reserve)}</p>
              <input
                type="range"
                min={0}
                max={reserveMax}
                step={100}
                value={Math.min(reserve, reserveMax)}
                onChange={(event) => setReserve(Number(event.target.value))}
                aria-label="Резерв"
                className="w-full accent-[#FFDD2D]"
              />
              <div className="flex flex-wrap gap-2">
                {[0, 500, 1000, 2000].map((value) => (
                  <Chip key={value} active={reserve === value} onClick={() => setReserve(value)}>
                    {value === 0 ? 'Без резерва' : formatRub(value)}
                  </Chip>
                ))}
              </div>
            </Question>
          )}

          {step === 'period' && (
            <Question pose="think" title="Как показывать лимит?" text="Потом можно поменять на главной в один тап.">
              <div className="flex flex-col gap-2" role="radiogroup" aria-label="Период лимита">
                {PERIODS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={period === option.value}
                    onClick={() => setPeriod(option.value)}
                    className={`flex flex-col gap-0.5 rounded-2xl border-2 p-4 text-left transition ${period === option.value ? 'border-ink bg-card' : 'border-transparent bg-card hover:border-line'}`}
                  >
                    <span className="font-bold text-ink">{option.title}</span>
                    <span className="text-sm text-muted">{option.text}</span>
                  </button>
                ))}
              </div>
            </Question>
          )}

          {step === 'result' && <Result result={result} error={error} onRetry={() => go('period')} onFinish={finish} />}
        </div>

        {step !== 'result' && (
          <div className="mt-6 flex flex-col gap-3">
            {error && <ErrorNote>{error}</ErrorNote>}
            <Button type="submit" className="w-full">
              {step === 'hello' ? 'Начать' : step === 'period' ? 'Посчитать лимит' : step === 'city' && !city.city ? 'Пропустить' : 'Дальше'}
            </Button>
            {step === 'hello' && (
              <Button variant="ghost" onClick={fillExample}>
                Заполнить примером
              </Button>
            )}
          </div>
        )}
      </form>
    </div>
  )
}

function Question({ pose, title, text, children }: { pose: RaccoonPose; title: string; text: string; children: ReactNode }) {
  return (
    <>
      <div className="flex items-center gap-4">
        <Raccoon pose={pose} size={96} />
        <div>
          <h1 className="text-2xl leading-tight font-bold text-ink sm:text-3xl">{title}</h1>
        </div>
      </div>
      <p className="text-muted">{text}</p>
      {children}
    </>
  )
}

function MoneyRow({ label, value, onChange, autoFocus = false }: { label: string; value: string; onChange: (value: string) => void; autoFocus?: boolean }) {
  return (
    <label className="flex items-center gap-3 rounded-2xl bg-card p-2 pl-4">
      <span className="flex-1 text-ink">{label}</span>
      <span className="w-40">
        <MoneyInput value={value} onChange={onChange} placeholder="0" autoFocus={autoFocus} aria-label={label} />
      </span>
    </label>
  )
}

const CONFETTI_COLORS = ['#FFDD2D', '#1C1C1E', '#A4A6AB', '#FFB020']

function Result({
  result,
  error,
  onRetry,
  onFinish,
}: {
  result: { me: Me; dashboard: Dashboard } | null
  error: string | null
  onRetry: () => void
  onFinish: () => void
}) {
  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <Raccoon pose="worried" size={140} />
        <ErrorNote>{error}</ErrorNote>
        <Button onClick={onRetry}>Вернуться</Button>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center" role="status">
        <Raccoon pose="count" size={170} />
        <p className="text-xl font-bold text-ink">Енот пересчитывает деньги…</p>
        <p className="text-muted">Вычитаем обязательные траты и резерв, делим на дни до стипендии.</p>
      </div>
    )
  }

  const { budget, stipend } = result.dashboard
  const days = budget.period_days
  const value = days === 1 ? budget.left_today : budget.left_in_period
  const label = days === 1 ? 'Сегодня можно' : days === 7 ? 'На неделю можно' : `На ${days} ${pluralDays(days)} можно`

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-3 overflow-hidden text-center">
      {Array.from({ length: 24 }, (_, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{ left: `${(i * 37) % 100}%`, background: CONFETTI_COLORS[i % CONFETTI_COLORS.length], animationDelay: `${(i % 8) * 0.1}s` }}
          aria-hidden="true"
        />
      ))}
      <Raccoon pose="celebrate" size={160} />
      <p className="text-lg text-muted">{label}</p>
      <p className="pop-in text-6xl font-extrabold text-ink">{formatRub(value)}</p>
      <p className="max-w-sm text-ink">{budget.message}</p>
      <p className="text-sm text-muted">
        До стипендии {stipend.days_until} {pluralDays(stipend.days_until)} · свободно {formatRub(budget.free_money)}
      </p>
      <Button className="mt-4 w-full max-w-xs" onClick={onFinish}>
        Поехали
      </Button>
    </div>
  )
}
