import { useEffect, useMemo, useState } from 'react'
import { MapPin } from 'lucide-react'
import { api } from '../lib/api'
import type { Region } from '../lib/types'
import { TextInput } from './ui'

export interface CityValue {
  city: string | null
  regionCode: string | null
  regionName: string | null
}

let regionsCache: Promise<Region[]> | null = null

function loadRegions(): Promise<Region[]> {
  regionsCache ??= api.regions().catch((error: unknown) => {
    regionsCache = null
    throw error
  })
  return regionsCache
}

const normalize = (text: string) => text.trim().toLowerCase().replaceAll('ё', 'е')

interface Match {
  city: string | null
  region: Region
}

function search(regions: Region[], query: string): Match[] {
  const wanted = normalize(query)
  if (wanted.length < 2) return []
  const matches: Match[] = []
  for (const region of regions) {
    for (const city of region.cities) {
      if (normalize(city).startsWith(wanted)) matches.push({ city, region })
    }
    if (normalize(region.name).includes(wanted)) matches.push({ city: null, region })
  }
  return matches.slice(0, 8)
}

/** Город для цен региона: поиск по городам и регионам. Нет в списке — берём среднее по России. */
export default function CityPicker({ value, onChange, inputId }: { value: CityValue; onChange: (value: CityValue) => void; inputId?: string }) {
  const [regions, setRegions] = useState<Region[]>([])
  const [query, setQuery] = useState(value.city ?? value.regionName ?? '')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    loadRegions().then(setRegions).catch(() => setRegions([]))
  }, [])

  const matches = useMemo(() => search(regions, query), [regions, query])

  const pick = (match: Match) => {
    const label = match.city ?? match.region.name
    setQuery(label)
    setOpen(false)
    onChange({ city: match.city, regionCode: match.region.code, regionName: match.region.name })
  }

  const chosen = value.regionName ?? (value.city ? 'Среднее по России' : null)

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <TextInput
          id={inputId}
          value={query}
          placeholder="Например, Красноярск"
          autoComplete="off"
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls="city-options"
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            onChange({ city: event.target.value.trim() || null, regionCode: null, regionName: null })
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        />
        {open && matches.length > 0 && (
          <ul id="city-options" role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-2xl border border-line bg-card shadow-lg">
            {matches.map((match) => (
              <li key={`${match.region.code}-${match.city ?? 'region'}`} role="option" aria-selected={false}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(match)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-chip"
                >
                  <MapPin className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                  <span className="text-ink">{match.city ?? match.region.name}</span>
                  {match.city && <span className="truncate text-sm text-muted">{match.region.name}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {chosen && (
        <span className="text-sm text-muted">
          Цены: <b className="font-semibold text-ink">{chosen}</b>
          {!value.regionCode && ' — города нет в списке, возьмём среднее по России'}
        </span>
      )}
    </div>
  )
}
