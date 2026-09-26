import { Info, Lock, ShieldCheck } from 'lucide-react'

/** Три обязательных предупреждения о приватности. Показываются на каждом экране. */
export default function PrivacyNotice({ className = '' }: { className?: string }) {
  return (
    <aside
      aria-label="Приватность и ограничения"
      className={`space-y-2 rounded-2xl bg-slate-100 p-4 text-xs leading-relaxed text-slate-600 ${className}`}
    >
      <p className="flex gap-2">
        <Info className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
        Расчёт является ориентиром, а не финансовой рекомендацией.
      </p>
      <p className="flex gap-2">
        <Lock className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
        Данные сохраняются только в браузере этого устройства.
      </p>
      <p className="flex gap-2">
        <ShieldCheck className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
        Лимит+ не запрашивает логин, пароль, коды подтверждения и доступ к банковскому приложению.
      </p>
    </aside>
  )
}
