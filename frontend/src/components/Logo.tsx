export default function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-bold text-slate-900">
      <svg viewBox="0 0 64 64" className="size-8" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill="#0d9488" />
        <path d="M18 44V22h6v16h12v6z" fill="#fff" />
        <path d="M44 22v6h6v6h-6v6h-6v-6h-6v-6h6v-6z" fill="#99f6e4" />
      </svg>
      <span className="text-lg">Лимит+</span>
    </span>
  )
}
