/** Логотип: жёлтый квадрат «Л+» и название. */
export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-base font-extrabold text-accent-ink" aria-hidden="true">
        Л+
      </span>
      {!compact && <span className="text-lg font-bold text-ink">Лимит+</span>}
    </span>
  )
}
