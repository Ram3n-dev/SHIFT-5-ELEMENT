import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, LogOut, Pencil, Plus, Trash2 } from 'lucide-react'
import CityPicker, { type CityValue } from '../components/CityPicker'
import ConfirmDialog from '../components/ConfirmDialog'
import { OPEN_COOKIE_BANNER } from '../components/CookieBanner'
import { Button, Card, ErrorNote, Field, IconButton, MoneyInput, PageTitle, Segmented, Select, Sheet, TextInput, Toggle } from '../components/ui'
import { api } from '../lib/api'
import { askNotificationPermission, notificationPermission } from '../lib/browserNotifications'
import { EXPENSE_CATEGORIES } from '../lib/categories'
import { resetCookieChoice } from '../lib/consent'
import { formatDate, formatRub, nextStipendDate, parseAmount, todayISO } from '../lib/format'
import type { Account, AccountInput, AccountType, Me, Recurring, RecurringInput, Theme } from '../lib/types'
import { useApp } from '../state/AppContext'

export default function SettingsPage() {
  const { me } = useApp()
  if (!me) return null

  return (
    <div>
      <PageTitle title="Профиль" subtitle={me.user.is_demo ? 'Демо-вход: данные удалятся через 7 дней' : (me.user.email ?? me.user.name)} />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-4">
          <BudgetSection me={me} />
          <AppearanceSection me={me} />
        </div>
        <div className="flex flex-col gap-4">
          <AccountsSection />
          <RecurringSection />
          {me.user.is_admin && (
            <Card className="flex flex-col gap-3">
              <SectionTitle>Админ-панель</SectionTitle>
              <p className="text-sm text-muted">Промпт Енота, число пользователей и даты последнего захода.</p>
              <Link to="/admin" className="inline-flex h-10 w-fit items-center rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink">
                Открыть
              </Link>
            </Card>
          )}
          <PrivacySection />
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: string }) {
  return <h2 className="text-lg font-bold text-ink">{children}</h2>
}

const money = (value: number) => String(value).replace('.', ',')

// ---------- Бюджет ----------

function BudgetSection({ me }: { me: Me }) {
  const { setMe, dataChanged, showToast } = useApp()
  const profile = me.profile
  const [city, setCity] = useState<CityValue>({ city: profile.city, regionCode: profile.region_code, regionName: profile.region_name })
  const [stipend, setStipend] = useState(money(profile.stipend_amount))
  const [stipendDay, setStipendDay] = useState(profile.stipend_day)
  const [mandatory, setMandatory] = useState(money(profile.mandatory_monthly))
  const [mandatoryLeft, setMandatoryLeft] = useState(money(profile.mandatory_left))
  const [reserve, setReserve] = useState(money(profile.reserve))
  const [period, setPeriod] = useState(profile.limit_period_days)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    const values = [stipend, mandatory, mandatoryLeft, reserve].map((value) => (value.trim() === '' ? 0 : parseAmount(value)))
    if (values.some((value) => !Number.isFinite(value) || value < 0)) {
      setError('Суммы должны быть числами не меньше нуля.')
      return
    }
    const [stipendAmount, mandatoryMonthly, left, reserveAmount] = values
    setSaving(true)
    setError(null)
    try {
      setMe(
        await api.updateProfile({
          city: city.city ?? '',
          region_code: city.regionCode ?? '',
          stipend_amount: stipendAmount,
          stipend_day: stipendDay,
          mandatory_monthly: mandatoryMonthly,
          mandatory_left: left,
          reserve: reserveAmount,
          limit_period_days: period,
        }),
      )
      await dataChanged()
      showToast({ title: 'Сохранено', text: 'Енот пересчитал лимит.', pose: 'count' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <SectionTitle>Бюджет</SectionTitle>
      <Field label="Город — для цен региона">{(id) => <CityPicker inputId={id} value={city} onChange={setCity} />}</Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Стипендия">{(id) => <MoneyInput id={id} value={stipend} onChange={setStipend} />}</Field>
        <Field label="Приходит числа" hint={`Следующая — ${formatDate(nextStipendDate(stipendDay))}`}>
          {(id) => (
            <Select id={id} value={stipendDay} onChange={(event) => setStipendDay(Number(event.target.value))}>
              {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Обязательные в месяц" hint="Общежитие, проезд, связь">
          {(id) => <MoneyInput id={id} value={mandatory} onChange={setMandatory} />}
        </Field>
        <Field label="Из них осталось оплатить" hint="До следующей стипендии">
          {(id) => <MoneyInput id={id} value={mandatoryLeft} onChange={setMandatoryLeft} />}
        </Field>
        <Field label="Резерв" hint="Не входит в лимит">
          {(id) => <MoneyInput id={id} value={reserve} onChange={setReserve} />}
        </Field>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted">Показывать лимит</span>
        <Segmented
          label="Период лимита"
          value={period}
          onChange={setPeriod}
          options={[
            { value: 1, label: 'На день' },
            { value: 3, label: 'На 3 дня' },
            { value: 7, label: 'На неделю' },
          ]}
        />
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Button loading={saving} onClick={save}>
        Сохранить
      </Button>
    </Card>
  )
}

// ---------- Оформление и уведомления ----------

function AppearanceSection({ me }: { me: Me }) {
  const { setMe } = useApp()
  const [permission, setPermission] = useState(notificationPermission())

  const update = async (patch: { theme?: Theme; notifications_enabled?: boolean }) => {
    setMe(await api.updateProfile(patch))
  }

  return (
    <Card className="flex flex-col gap-4">
      <SectionTitle>Оформление и уведомления</SectionTitle>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted">Тема</span>
        <Segmented
          label="Тема"
          value={me.profile.theme}
          onChange={(theme) => update({ theme })}
          options={[
            { value: 'light', label: 'Светлая' },
            { value: 'dark', label: 'Тёмная' },
            { value: 'system', label: 'Как в системе' },
          ]}
        />
      </div>
      <Toggle
        checked={me.profile.notifications_enabled}
        onChange={(value) => update({ notifications_enabled: value })}
        label="Напоминания Енота"
        description="Не больше двух в день: отметить траты, огонёк, стипендия, кэшбэк."
      />
      {me.profile.notifications_enabled && permission !== 'unsupported' && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-chip px-4 py-3 text-sm">
          <span className="text-ink">
            {permission === 'granted'
              ? 'Уведомления браузера включены — напомним, даже если вкладка свёрнута.'
              : permission === 'denied'
                ? 'Уведомления браузера запрещены — включи их в настройках сайта.'
                : 'Показывать напоминания, даже когда вкладка свёрнута?'}
          </span>
          {permission === 'default' && (
            <Button size="sm" onClick={async () => setPermission(await askNotificationPermission())}>
              Разрешить
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}

// ---------- Счета ----------

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'card', label: 'Карта' },
  { value: 'cash', label: 'Наличные' },
  { value: 'savings', label: 'Накопления' },
]

function AccountsSection() {
  const { version, dataChanged } = useApp()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [editing, setEditing] = useState<Account | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Account | null>(null)

  useEffect(() => {
    api.accounts().then(setAccounts).catch(() => setAccounts([]))
  }, [version])

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <SectionTitle>Счета</SectionTitle>
        <Button size="sm" variant="secondary" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Счёт
        </Button>
      </div>
      <ul className="flex flex-col divide-y divide-line">
        {accounts.map((account) => (
          <li key={account.id} className="flex items-center gap-2 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">{account.name}</p>
              <p className="text-sm text-muted">
                {ACCOUNT_TYPES.find((type) => type.value === account.type)?.label}
                {!account.include_in_spending && ' · не входит в лимит'}
              </p>
            </div>
            <span className="font-semibold text-ink">{formatRub(account.balance)}</span>
            <IconButton label={`Изменить ${account.name}`} className="text-muted" onClick={() => setEditing(account)}>
              <Pencil className="h-4 w-4" />
            </IconButton>
            <IconButton label={`Удалить ${account.name}`} className="text-muted" onClick={() => setDeleting(account)}>
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </li>
        ))}
      </ul>

      <AccountEditor
        account={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          dataChanged()
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Удалить счёт?"
        text={deleting ? `«${deleting.name}» удалится, операции останутся без счёта.` : ''}
        confirmLabel="Удалить"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          await api.deleteAccount(deleting.id)
          await dataChanged()
        }}
      />
    </Card>
  )
}

function AccountEditor({ account, onClose, onSaved }: { account: Account | 'new' | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('card')
  const [balance, setBalance] = useState('')
  const [include, setInclude] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (account === null) return
    const current = account === 'new' ? null : account
    setName(current?.name ?? '')
    setType(current?.type ?? 'card')
    setBalance(current ? money(current.balance) : '')
    setInclude(current?.include_in_spending ?? true)
    setError(null)
  }, [account])

  const save = async () => {
    const value = balance.trim() === '' ? 0 : parseAmount(balance)
    if (!name.trim() || !Number.isFinite(value)) {
      setError('Укажи название и баланс.')
      return
    }
    const input: AccountInput = { name: name.trim(), type, balance: value, include_in_spending: include }
    setSaving(true)
    setError(null)
    try {
      if (account === 'new') await api.createAccount(input)
      else if (account) await api.updateAccount(account.id, input)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={account !== null} onClose={onClose} title={account === 'new' ? 'Новый счёт' : 'Счёт'}>
      <div className="flex flex-col gap-4">
        <Field label="Название">{(id) => <TextInput id={id} maxLength={40} value={name} onChange={(event) => setName(event.target.value)} />}</Field>
        <Segmented
          label="Тип счёта"
          value={type}
          onChange={(value) => {
            setType(value)
            setInclude(value !== 'savings')
          }}
          options={ACCOUNT_TYPES}
        />
        <Field label="Баланс сейчас">{(id) => <MoneyInput id={id} value={balance} onChange={setBalance} />}</Field>
        <Toggle checked={include} onChange={setInclude} label="Входит в лимит" description="Накопления обычно не тратим — выключи." />
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button loading={saving} onClick={save}>
          Сохранить
        </Button>
      </div>
    </Sheet>
  )
}

// ---------- Регулярные платежи ----------

function RecurringSection() {
  const { version, dataChanged, dashboard, showToast } = useApp()
  const [items, setItems] = useState<Recurring[]>([])
  const [editing, setEditing] = useState<Recurring | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Recurring | null>(null)
  const card = dashboard?.accounts.find((account) => account.type === 'card')

  useEffect(() => {
    api.recurring().then(setItems).catch(() => setItems([]))
  }, [version])

  const paid = async (item: Recurring) => {
    try {
      await api.recurringPaid(item.id, card?.id ?? null)
      await dataChanged()
      showToast({ title: 'Оплачено', text: `«${item.name}» записан, следующий платёж — через месяц.`, pose: 'calm' })
    } catch (err) {
      showToast({ title: 'Не получилось', text: err instanceof Error ? err.message : undefined, pose: 'worried' })
    }
  }

  return (
    <Card className="flex flex-col gap-3" id="recurring">
      <div className="flex items-center justify-between">
        <SectionTitle>Регулярные платежи</SectionTitle>
        <Button size="sm" variant="secondary" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Платёж
        </Button>
      </div>
      <p className="text-sm text-muted">Интернет, подписки, общежитие. Енот заранее откладывает на них деньги из лимита.</p>
      {items.length === 0 && <p className="text-sm text-muted">Платежей пока нет.</p>}
      <ul className="flex flex-col divide-y divide-line">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">{item.name}</p>
              <p className="text-sm text-muted">
                {formatRub(item.amount)} · {item.enabled ? formatDate(item.next_date) : 'выключен'}
              </p>
            </div>
            {item.enabled && (
              <Button size="sm" variant="secondary" aria-label={`${item.name}: оплачено`} onClick={() => paid(item)}>
                <Check className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Оплачено</span>
              </Button>
            )}
            <IconButton label={`Изменить ${item.name}`} className="text-muted" onClick={() => setEditing(item)}>
              <Pencil className="h-4 w-4" />
            </IconButton>
            <IconButton label={`Удалить ${item.name}`} className="text-muted" onClick={() => setDeleting(item)}>
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </li>
        ))}
      </ul>

      <RecurringEditor
        item={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          dataChanged()
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Удалить платёж?"
        text={deleting ? `«${deleting.name}» больше не будет учитываться в лимите.` : ''}
        confirmLabel="Удалить"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          await api.deleteRecurring(deleting.id)
          await dataChanged()
        }}
      />
    </Card>
  )
}

function RecurringEditor({ item, onClose, onSaved }: { item: Recurring | 'new' | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Связь')
  const [nextDate, setNextDate] = useState(todayISO())
  const [enabled, setEnabled] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (item === null) return
    const current = item === 'new' ? null : item
    setName(current?.name ?? '')
    setAmount(current ? money(current.amount) : '')
    setCategory(current?.category ?? 'Связь')
    setNextDate(current?.next_date ?? todayISO())
    setEnabled(current?.enabled ?? true)
    setError(null)
  }, [item])

  const save = async () => {
    const value = parseAmount(amount)
    if (!name.trim() || !Number.isFinite(value) || value <= 0) {
      setError('Укажи название и сумму больше нуля.')
      return
    }
    const input: RecurringInput = { name: name.trim(), amount: value, category, next_date: nextDate, enabled }
    setSaving(true)
    setError(null)
    try {
      if (item === 'new') await api.createRecurring(input)
      else if (item) await api.updateRecurring(item.id, input)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={item !== null} onClose={onClose} title={item === 'new' ? 'Новый платёж' : 'Платёж'}>
      <div className="flex flex-col gap-4">
        <Field label="Название">
          {(id) => <TextInput id={id} maxLength={60} placeholder="Интернет" value={name} onChange={(event) => setName(event.target.value)} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Сумма">{(id) => <MoneyInput id={id} value={amount} onChange={setAmount} />}</Field>
          <Field label="Следующий платёж">
            {(id) => <TextInput id={id} type="date" value={nextDate} onChange={(event) => setNextDate(event.target.value || todayISO())} />}
          </Field>
        </div>
        <Field label="Категория">
          {(id) => (
            <Select id={id} value={category} onChange={(event) => setCategory(event.target.value)}>
              {EXPENSE_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Toggle checked={enabled} onChange={setEnabled} label="Учитывать в лимите" />
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button loading={saving} onClick={save}>
          Сохранить
        </Button>
      </div>
    </Sheet>
  )
}

// ---------- Данные и выход ----------

function PrivacySection() {
  const { logout, retry } = useApp()
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <Card className="flex flex-col gap-3">
      <SectionTitle>Данные</SectionTitle>
      <p className="text-sm text-muted">
        Только учебные данные: не вводи реальные пароли, номера карт и коды из SMS.{' '}
        <Link to="/privacy" className="font-medium text-ink underline">
          Как мы храним данные
        </Link>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            resetCookieChoice()
            window.dispatchEvent(new Event(OPEN_COOKIE_BANNER))
          }}
        >
          Настройки cookie
        </Button>
        <Button size="sm" variant="secondary" onClick={logout}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Выйти
        </Button>
        <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)}>
          Удалить мои данные
        </Button>
      </div>
      <ConfirmDialog
        open={deleteOpen}
        title="Удалить все данные?"
        text="Удалятся профиль, счета, операции, кэшбэк и переписка с Енотом. Отменить нельзя."
        confirmLabel="Удалить всё"
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          await api.deleteProfile()
          retry()
        }}
      />
    </Card>
  )
}
