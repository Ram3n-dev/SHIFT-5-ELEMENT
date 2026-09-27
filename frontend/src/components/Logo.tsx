/** Логотип: жёлтый квадрат «Е» и название. */
export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-base font-extrabold text-accent-ink" aria-hidden="true">
        Е
      </span>
      {!compact && <span className="text-lg font-bold text-ink">Енотономика</span>}
    </span>
  )
}
