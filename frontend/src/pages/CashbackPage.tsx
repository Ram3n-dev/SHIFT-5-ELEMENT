import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Plus, Trash2 } from 'lucide-react'
import Raccoon from '../components/Raccoon'
import ScreenshotImport from '../components/ScreenshotImport'
import { Button, Card, ErrorNote, Field, IconButton, PageTitle, Segmented, Select, Spinner, TextInput, TileLabel } from '../components/ui'
import { api } from '../lib/api'
import { parseCashbackOptions, parseOffers } from '../lib/cashbackText'
import { ALL_PURCHASES, EXPENSE_CATEGORIES } from '../lib/categories'
import { daysBetween, formatDate, formatPercent, formatRub, monthKey, monthName, parseAmount, todayISO } from '../lib/format'
import type { CashbackMonth, CashbackOptionInput, CashbackResults, PartnerOffer } from '../lib/types'
import { useApp } from '../state/AppContext'

// Кэшбэк: 1) пользователь добавляет категории, которые банк предложил на месяц (скриншот или вручную);
// 2) код считает, какие 4 принесут больше рублей по его тратам; 3) Енот объясняет выбор;
<<<<<<< HEAD
// 4) в конце месяца — итоги: сколько реально принёс кэшбэк. Выбор категорий к банку не отправляется.
=======
// 4) в конце месяца — итоги: сколько реально принёс кэшбэк. К банку Лимит+ не подключается.
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88

type Tab = 'choose' | 'results' | 'partners'

export default function CashbackPage() {
  const [tab, setTab] = useState<Tab>('choose')

  return (
    <div>
      <PageTitle title="Кэшбэк" subtitle="Енот подберёт категории, которые принесут больше рублей" />
      <Segmented
        label="Раздел кэшбэка"
        value={tab}
        onChange={setTab}
        className="mb-4 max-w-md"
        options={[
          { value: 'choose', label: 'Выбор' },
          { value: 'results', label: 'Итоги' },
          { value: 'partners', label: 'Партнёры' },
        ]}
      />
      {tab === 'choose' && <ChooseTab />}
      {tab === 'results' && <ResultsTab />}
      {tab === 'partners' && <PartnersTab />}
    </div>
  )
}

// ---------- Выбор категорий ----------

interface DraftOption {
  key: number
  name: string
  percent: string
  category: string
}

const MAX_CHOSEN = 4
let draftKey = 0

function toDraft(option: { name: string; percent: number; category?: string | null }): DraftOption {
  return { key: ++draftKey, name: option.name, percent: String(option.percent).replace('.', ','), category: option.category ?? '' }
}

function emptyDraft(): DraftOption {
  return { key: ++draftKey, name: '', percent: '', category: '' }
}

function ChooseTab() {
  // С 20-го числа уже выбирают кэшбэк на следующий месяц.
  const [offset, setOffset] = useState(new Date().getDate() >= 20 ? 1 : 0)
  const month = monthKey(offset)
  const [data, setData] = useState<CashbackMonth | null>(null)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const show = (value: CashbackMonth) => {
    setData(value)
    setEditing(value.options.length === 0)
  }

  useEffect(() => {
    setData(null)
    setError(null)
    api
      .cashbackMonth(month)
      .then(show)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Не удалось загрузить кэшбэк.'))
  }, [month])

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        label="Месяц"
        value={offset}
        onChange={setOffset}
        className="max-w-xs"
        options={[
          { value: 0, label: capitalize(monthName(0)) },
          { value: 1, label: capitalize(monthName(1)) },
        ]}
      />

      {error && <ErrorNote>{error}</ErrorNote>}
      {!data && !error && <Spinner />}

      {data && (
        <div className={data.plan && !editing ? 'grid gap-4 lg:grid-cols-2 lg:items-start' : 'max-w-2xl'}>
          <OptionsCard key={data.month} data={data} editing={editing} onEdit={() => setEditing(true)} onSaved={show} />
          {data.plan && !editing && <PlanCard key={`${data.month}-plan`} data={data} onSaved={show} />}
        </div>
      )}
    </div>
  )
}

/** Шаг 1: категории, которые банк предложил на месяц. Со скриншота или вручную. */
function OptionsCard({
  data,
  editing,
  onEdit,
  onSaved,
}: {
  data: CashbackMonth
  editing: boolean
  onEdit: () => void
  onSaved: (value: CashbackMonth) => void
}) {
  const [drafts, setDrafts] = useState<DraftOption[]>(() => (data.options.length > 0 ? data.options.map(toDraft) : [emptyDraft()]))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (key: number, patch: Partial<DraftOption>) =>
    setDrafts((list) => list.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)))

  const save = async () => {
    const options: CashbackOptionInput[] = []
    for (const draft of drafts) {
      const name = draft.name.trim()
      if (!name && !draft.percent.trim()) continue
      const percent = parseAmount(draft.percent)
      if (!name || !Number.isFinite(percent) || percent <= 0 || percent > 100) {
        setError(`Проверь строку «${name || 'без названия'}»: нужно название и процент от 0,1 до 100.`)
        return
      }
      options.push({ name, percent, category: draft.category || null })
    }
    if (options.length === 0) {
      setError('Добавь хотя бы одну категорию.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      onSaved(await api.saveCashbackOptions(data.month, options))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <TileLabel>Шаг 1. Что предлагает банк на {data.month_name}</TileLabel>
          <p className="text-sm text-muted">Скриншот экрана выбора категорий или ввод вручную.</p>
        </div>
        {!editing && (
          <Button size="sm" variant="secondary" onClick={onEdit}>
            Изменить
          </Button>
        )}
      </div>

      {!editing ? (
        <ul className="flex flex-wrap gap-2">
          {data.options.map((option) => (
            <li key={option.id} className="rounded-full bg-chip px-3 py-1.5 text-sm text-ink">
              {option.name} · {formatPercent(option.percent)}
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ScreenshotImport
            label="Загрузить скриншот категорий"
            parse={parseCashbackOptions}
<<<<<<< HEAD
            emptyMessage="Не нашли на картинке категории кэшбэка. Попробуй скриншот целиком или добавь категории вручную."
=======
            emptyMessage="Не нашли на скриншоте строк вида «Категория 5%». Добавь категории вручную."
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
            onParsed={(items) => setDrafts((list) => [...list.filter((draft) => draft.name.trim() !== ''), ...items.map((item) => toDraft(item))])}
          />

          <div className="flex flex-col gap-2">
            {drafts.map((draft) => (
              <div key={draft.key} className="flex flex-wrap items-center gap-2 rounded-2xl bg-chip p-2">
                <TextInput
                  aria-label="Название категории"
                  placeholder="Супермаркеты"
                  maxLength={60}
                  className="min-w-0 flex-1"
                  value={draft.name}
                  onChange={(event) => update(draft.key, { name: event.target.value })}
                />
                <div className="relative w-24">
                  <TextInput
                    aria-label="Процент кэшбэка"
                    inputMode="decimal"
                    placeholder="5"
                    className="pr-8"
                    value={draft.percent}
                    onChange={(event) => update(draft.key, { percent: event.target.value.replace(/[^\d.,]/g, '') })}
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted">%</span>
                </div>
                <Select
                  aria-label="Какие траты сюда относятся"
                  className="order-last"
                  value={draft.category}
                  onChange={(event) => update(draft.key, { category: event.target.value })}
                >
                  <option value="">Определить само</option>
                  <option value={ALL_PURCHASES}>Все покупки</option>
                  {EXPENSE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>
                <IconButton label="Удалить строку" className="text-muted" onClick={() => setDrafts((list) => list.filter((item) => item.key !== draft.key))}>
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            ))}
          </div>

          {error && <ErrorNote>{error}</ErrorNote>}

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDrafts((list) => [...list, emptyDraft()])}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Добавить строку
            </Button>
            <Button size="sm" loading={busy} onClick={save}>
              Сохранить и подобрать
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}

/** Шаг 2: какие категории выбрать. Считает код, Енот объясняет. */
function PlanCard({ data, onSaved }: { data: CashbackMonth; onSaved: (value: CashbackMonth) => void }) {
  const { dataChanged, showToast } = useApp()
  const plan = data.plan!
  const recommended = plan.best.map((item) => item.id)
  const saved = data.options.filter((option) => option.chosen).map((option) => option.id)
  // Пока ничего не выбрано — отмечаем совет Енота, пользователь может поменять.
  const [chosen, setChosen] = useState<string[]>(saved.length > 0 ? saved : recommended)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sameAs = (list: string[]) => list.length === chosen.length && list.every((id) => chosen.includes(id))
  const isSaved = saved.length > 0 && sameAs(saved)

  const toggle = (id: string) => {
    if (chosen.includes(id)) {
      setChosen(chosen.filter((item) => item !== id))
      setError(null)
    } else if (chosen.length < MAX_CHOSEN) {
      setChosen([...chosen, id])
      setError(null)
    } else {
      setError(`Можно выбрать до ${MAX_CHOSEN} категорий — сначала сними одну.`)
    }
  }

  const choose = async (ids: string[]) => {
    setBusy(true)
    setError(null)
    try {
      onSaved(await api.chooseCashback(data.month, ids))
      setChosen(ids)
      dataChanged()
      showToast({
        title: 'Выбор сохранён',
        text: 'Теперь отметь эти же категории в приложении банка — сами мы к банку не подключаемся.',
        pose: 'celebrate',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить выбор.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <TileLabel>Шаг 2. Енот советует</TileLabel>
          <p className="text-3xl font-extrabold text-ink">≈ {formatRub(plan.expected_total)}</p>
          <p className="text-sm text-muted">в месяц — по твоим тратам картой за последние 3 месяца</p>
        </div>
        <Raccoon pose="eureka" size={80} />
      </div>

      <ul className="flex flex-col gap-2">
        {[...plan.best, ...plan.rest].map((pick) => {
          const selected = chosen.includes(pick.id)
          const note = recommended.includes(pick.id) ? 'совет Енота' : pick.expected_rub === 0 ? 'таких трат почти нет' : 'выгоды меньше'
          return (
            <li key={pick.id}>
              <button
                type="button"
                onClick={() => toggle(pick.id)}
                aria-pressed={selected}
                className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${selected ? 'border-ink bg-chip' : 'border-line hover:bg-chip'}`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${selected ? 'bg-accent text-accent-ink' : 'border border-line'}`}
                  aria-hidden="true"
                >
                  {selected && <Check className="h-4 w-4" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">
                    {pick.name} · {formatPercent(pick.percent)}
                  </span>
                  <span className="text-xs text-muted">{note}</span>
                </span>
                <span className="shrink-0 font-semibold text-ink">{formatRub(pick.expected_rub)}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {plan.cap_reached && <p className="text-sm text-muted">Упёрлись в лимит банка — больше 3 000 ₽ за месяц кэшбэк не начисляют.</p>}

      {data.explanation && (
        <div className="flex flex-col gap-2 rounded-2xl bg-chip p-4">
          <p className="leading-relaxed text-ink">{data.explanation}</p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted">Ориентир, а не рекомендация.</span>
            <Link to="/chat?q=cashback_pick" className="text-sm font-semibold text-ink underline-offset-4 hover:underline">
              Спросить Енота подробнее
            </Link>
          </div>
        </div>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="flex flex-wrap gap-2">
        <Button loading={busy} disabled={chosen.length === 0 || isSaved} onClick={() => choose(chosen)}>
          {isSaved ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              Выбор сохранён
            </>
          ) : (
            `Сохранить выбор (${chosen.length})`
          )}
        </Button>
        {!sameAs(recommended) && (
          <Button variant="secondary" onClick={() => setChosen(recommended)}>
            Как советует Енот
          </Button>
        )}
      </div>
      <p className="text-xs text-muted">
<<<<<<< HEAD
        Можно выбрать до {MAX_CHOSEN} категорий. После выбора отметь их в приложении банка: Енотономика только считает и к банку не
=======
        Можно выбрать до {MAX_CHOSEN} категорий. После выбора отметь их в приложении банка: Лимит+ только считает и к банку не
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
        подключается.
      </p>
    </Card>
  )
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// ---------- Итоги месяца ----------

function ResultsTab() {
  const [offset, setOffset] = useState(0)
  const [data, setData] = useState<CashbackResults | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setData(null)
    setError(null)
    api
      .cashbackResults(monthKey(offset))
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Не удалось загрузить итоги.'))
  }, [offset])

  const result = data?.result
  const good = result ? result.total >= result.one_percent : false

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        label="Месяц итогов"
        value={offset}
        onChange={setOffset}
        className="max-w-md"
        options={[-2, -1, 0].map((value) => ({ value, label: capitalize(monthName(value)) }))}
      />

      {error && <ErrorNote>{error}</ErrorNote>}
      {!data && !error && <Spinner />}

      {data && !result && (
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <Raccoon pose="sleep" size={96} />
          <p className="font-semibold text-ink">За {data.month_name} категории не выбраны</p>
          <p className="max-w-sm text-sm text-muted">Выбери кэшбэк во вкладке «Выбор» — в конце месяца здесь появятся итоги.</p>
        </Card>
      )}

      {data && result && (
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <Card className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <TileLabel>Кэшбэк за {data.month_name}</TileLabel>
                <p className="text-4xl font-extrabold text-ink">{formatRub(result.total)}</p>
                {offset === 0 && <p className="text-sm text-muted">Месяц ещё идёт — это промежуточный итог.</p>}
              </div>
              <Raccoon pose={good ? 'celebrate' : 'think'} size={88} />
            </div>
            <ul className="flex flex-col divide-y divide-line">
              {result.per_option.map((pick) => (
                <li key={pick.id} className="flex items-baseline justify-between gap-2 py-2">
                  <span className="text-ink">
                    {pick.name} · {formatPercent(pick.percent)}
                  </span>
                  <span className="font-semibold text-ink">{formatRub(pick.expected_rub)}</span>
                </li>
              ))}
            </ul>
            {result.cap_reached && <p className="text-sm text-muted">Упёрлись в лимит банка 3 000 ₽ за месяц.</p>}
          </Card>

          <Card className="flex flex-col gap-3">
            <TileLabel>Насколько выгодно</TileLabel>
            <Compare label="Твой выбор" value={result.total} highlight />
            <Compare label="Лучший выбор из доступных" value={result.best_possible} />
            <Compare label="Если бы был 1% на всё" value={result.one_percent} />
            <p className="text-sm text-ink">
              {result.total >= result.best_possible
                ? 'Лучше выбрать было нельзя.'
                : `Другой набор категорий дал бы ещё ${formatRub(result.best_possible - result.total)}.`}
            </p>
            <p className="border-t border-line pt-3 text-sm text-muted">
<<<<<<< HEAD
              Всего с Енотономикой кэшбэка: <b className="text-ink">{formatRub(data.all_time_total)}</b>
=======
              Всего с Лимит+ кэшбэка: <b className="text-ink">{formatRub(data.all_time_total)}</b>
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
            </p>
          </Card>
        </div>
      )}
    </div>
  )
}

function Compare({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className={highlight ? 'font-semibold text-ink' : 'text-muted'}>{label}</span>
      <span className={`font-bold ${highlight ? 'text-ink' : 'text-muted'}`}>{formatRub(value)}</span>
    </div>
  )
}

// ---------- Партнёрские предложения ----------

function PartnersTab() {
  const [offers, setOffers] = useState<PartnerOffer[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [merchant, setMerchant] = useState('')
  const [percent, setPercent] = useState('')
  const [until, setUntil] = useState('')
  const [saving, setSaving] = useState(false)
  const [found, setFound] = useState<{ merchant: string; percent: number; valid_until: string | null }[]>([])

  const load = () =>
    api
      .partnerOffers()
      .then(setOffers)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Не удалось загрузить предложения.'))

  useEffect(() => {
    load()
  }, [])

  const add = async (items: { merchant: string; percent: number; valid_until: string | null }[]) => {
    setSaving(true)
    setError(null)
    try {
      for (const item of items) {
        await api.addPartnerOffer({ merchant: item.merchant, percent: item.percent, category: null, valid_until: item.valid_until })
      }
      await load()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить.')
      return false
    } finally {
      setSaving(false)
    }
  }

  const addManual = async () => {
    const value = parseAmount(percent)
    if (!merchant.trim() || !Number.isFinite(value) || value <= 0 || value > 100) {
      setError('Укажи магазин и процент от 0,1 до 100.')
      return
    }
    if (await add([{ merchant: merchant.trim(), percent: value, valid_until: until || null }])) {
      setMerchant('')
      setPercent('')
      setUntil('')
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <Card className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <Raccoon pose="think" size={64} />
          <p className="text-sm text-ink">
            Партнёрские предложения — повышенный кэшбэк в конкретном магазине на время: например, 10% в кофейне до 15 октября. Банк
            показывает их в своём приложении. Добавь их сюда — Енот напомнит, когда срок будет подходить к концу.
          </p>
        </div>

        <ScreenshotImport
          label="Загрузить скриншот предложений"
          parse={(text) => parseOffers(text)}
          emptyMessage="Не нашли на скриншоте предложений вида «Магазин 10% до 15 октября». Добавь вручную."
          onParsed={setFound}
        />

        {found.length > 0 && (
          <div className="flex flex-col gap-2 rounded-2xl bg-chip p-3">
            <span className="text-sm font-medium text-muted">Нашли на скриншоте — проверь:</span>
            {found.map((item, index) => (
              <div key={`${item.merchant}-${index}`} className="flex items-center justify-between gap-2 text-sm text-ink">
                <span>
                  {item.merchant} · {formatPercent(item.percent)}
                  {item.valid_until && ` · до ${formatDate(item.valid_until)}`}
                </span>
                <IconButton label="Убрать" size="sm" className="text-muted" onClick={() => setFound((list) => list.filter((_, i) => i !== index))}>
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            ))}
            <Button
              size="sm"
              loading={saving}
              onClick={async () => {
                if (await add(found)) setFound([])
              }}
            >
              Добавить всё
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="Магазин">
              {(id) => <TextInput id={id} maxLength={60} placeholder="Кофейня у универа" value={merchant} onChange={(event) => setMerchant(event.target.value)} />}
            </Field>
          </div>
          <Field label="Кэшбэк, %">
            {(id) => (
              <TextInput id={id} inputMode="decimal" placeholder="10" value={percent} onChange={(event) => setPercent(event.target.value.replace(/[^\d.,]/g, ''))} />
            )}
          </Field>
          <Field label="Действует до">
            {(id) => <TextInput id={id} type="date" min={todayISO()} value={until} onChange={(event) => setUntil(event.target.value)} />}
          </Field>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button variant="secondary" loading={saving} onClick={addManual}>
          Добавить предложение
        </Button>
      </Card>

      <Card className="flex flex-col gap-2">
        <TileLabel>Мои предложения</TileLabel>
        {!offers && !error && <Spinner />}
        {offers?.length === 0 && <p className="text-sm text-muted">Пока ничего нет.</p>}
        <ul className="flex flex-col divide-y divide-line">
          {offers?.map((offer) => {
            const daysLeft = offer.valid_until ? daysBetween(todayISO(), offer.valid_until) : null
            return (
              <li key={offer.id} className="flex items-center gap-3 py-2.5">
                <span className="flex h-10 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-sm font-bold text-accent-ink">
                  {formatPercent(offer.percent)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{offer.merchant}</span>
                  <span className="text-xs text-muted">
                    {offer.valid_until
                      ? daysLeft !== null && daysLeft < 0
                        ? 'срок закончился'
                        : `до ${formatDate(offer.valid_until)}${daysLeft !== null && daysLeft <= 3 ? ' — скоро закончится' : ''}`
                      : 'без срока'}
                  </span>
                </span>
                <IconButton
                  label={`Удалить ${offer.merchant}`}
                  className="text-muted"
                  onClick={async () => {
                    await api.deletePartnerOffer(offer.id)
                    load()
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}
