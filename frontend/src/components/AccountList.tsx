import type { ReactNode } from 'react'
import AccountCard from './AccountCard'
import { Card } from './ui'
import type { Account } from '../types'

interface Props {
  accounts: Account[]
  title?: string
  /** Кнопки справа от счёта (например, «Изменить» в настройках). */
  renderActions?: (account: Account) => ReactNode
  children?: ReactNode
}

export default function AccountList({ accounts, title = 'Счета', renderActions, children }: Props) {
  return (
    <Card>
      <h2 className="text-base font-semibold">{title}</h2>
      {accounts.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Счетов пока нет.</p>
      ) : (
        <ul className="mt-1 divide-y divide-slate-100">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} actions={renderActions?.(account)} />
          ))}
        </ul>
      )}
      {children}
    </Card>
  )
}
