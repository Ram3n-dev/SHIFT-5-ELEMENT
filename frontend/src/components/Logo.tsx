<<<<<<< HEAD
/** Логотип: жёлтый квадрат «Е» и название. */
=======
/** Логотип: жёлтый квадрат «Л+» и название. */
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-base font-extrabold text-accent-ink" aria-hidden="true">
<<<<<<< HEAD
        Е
      </span>
      {!compact && <span className="text-lg font-bold text-ink">Енотономика</span>}
=======
        Л+
      </span>
      {!compact && <span className="text-lg font-bold text-ink">Лимит+</span>}
>>>>>>> 2a9bed3edaa6bb9061576cf6c56bacea1d84cc88
    </span>
  )
}
