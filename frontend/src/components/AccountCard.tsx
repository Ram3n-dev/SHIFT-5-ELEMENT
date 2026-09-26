import type { ReactNode } from 'react'
import { Banknote, CreditCard, PiggyBank, type LucideIcon } from 'lucide-react'
import { formatRub } from '../lib/format'
import type { Account, AccountType } from '../types'

export const ACCOUNT_TYPE_META: Record<AccountType, { label: string; icon: LucideIcon }> = {
  card: { label: 'Карта', icon: CreditCard },
  cash: { label: 'Наличные', icon: Banknote },
  savings: { label: 'Накопления', icon: PiggyBank },
}

export default function AccountCard({ account, actions }: { account: Account; actions?: ReactNode }) {
  const { label, icon: Icon } = ACCOUNT_TYPE_META[account.type]

  return (
    <li className="flex items-center gap-3 py-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{account.name}</p>
        <p className="text-xs text-slate-500">
          {label}
          {!account.include_in_spending && ' · не входит в траты'}
        </p>
      </div>
      <p className={`font-semibold tabular-nums ${account.balance < 0 ? 'text-red-700' : 'text-slate-900'}`}>
        {formatRub(account.balance)}
      </p>
      {actions}
    </li>
  )
}
