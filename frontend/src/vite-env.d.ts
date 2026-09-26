/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Адрес backend. Пусто — запросы идут на тот же адрес (/api) через прокси Vite или nginx. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
