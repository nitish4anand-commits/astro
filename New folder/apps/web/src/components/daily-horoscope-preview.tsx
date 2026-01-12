"use client"
import React from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import LocationSelector from '@/components/location-selector'

type SignItem = {
  rashi?: number | string
  sign?: number | string
  name?: string
  title?: string
  score?: number
  summary?: string
  narrative?: string
}

const SIGN_NAMES = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'
]

function toName(item: SignItem, idx: number) {
  if (item?.name && typeof item.name === 'string') return item.name
  const n = (typeof item.rashi === 'number' ? item.rashi : typeof item.sign === 'number' ? item.sign : undefined)
  if (typeof n === 'number' && n >= 0 && n < 12) return SIGN_NAMES[n]
  return SIGN_NAMES[idx] || `Sign ${idx+1}`
}

function toBlurb(item: SignItem) {
  const anyItem: any = item as any
  if (anyItem?.summary) return anyItem.summary
  if (anyItem?.narrative) return anyItem.narrative
  if (anyItem?.title) return anyItem.title
  if (anyItem?.scores) {
    const h = anyItem.scores.health
    const c = anyItem.scores.career
    if (typeof h === 'number' || typeof c === 'number') {
      return `Health ${h ?? ''} • Career ${c ?? ''}`
    }
  }
  if (typeof anyItem?.score === 'number') return `Score: ${anyItem.score}`
  return ''
}

export default function DailyHoroscopePreview() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [items, setItems] = React.useState<SignItem[] | null>(null)
  const [basis, setBasis] = React.useState<'moon_sign' | 'lagna'>('moon_sign')
  const [loc, setLoc] = React.useState<{ lat: number; lon: number; tz: string } | null>(null)

  React.useEffect(() => {
    let ignore = false
    const ctrl = new AbortController()

    async function run() {
      setLoading(true)
      setError(null)
      try {
        // Determine location: selected or fallback
        let use = loc
        if (!use) {
          // read saved location if any
          try {
            const saved = typeof window !== 'undefined' ? localStorage.getItem('horoscope_location') : null
            if (saved) {
              const s = JSON.parse(saved)
              if (s?.lat && s?.lon && s?.tz) use = { lat: s.lat, lon: s.lon, tz: s.tz }
            }
          } catch {}
        }
        if (!use) {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
          use = { lat: 28.6139, lon: 77.2090, tz }
        }

        const url = `/api/daily?basis=${encodeURIComponent(basis)}&lat=${use.lat}&lon=${use.lon}&tz=${encodeURIComponent(use.tz)}`
        const res = await fetch(url, { signal: ctrl.signal })
        if (!res.ok) throw new Error(`API ${res.status}`)
        const data = await res.json()

        // Normalize various shapes to array; prefer backend 'cards'
        let arr: any = []
        if (Array.isArray(data)) arr = data
        else if (Array.isArray((data as any)?.cards)) arr = (data as any).cards
        else arr = (data as any)?.signs || (data as any)?.rows || (data as any)?.data || (data as any)?.result || []

        if (!ignore) setItems(Array.isArray(arr) ? arr.slice(0, 12) : [])
      } catch (e: any) {
        if (!ignore) {
          setError(e?.message || 'Failed to load daily horoscope')
          // Graceful fallback preview
          const sample = SIGN_NAMES.map((n) => ({ name: n, title: 'Steady focus and clarity today.' }))
          setItems(sample)
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    run()
    return () => {
      ignore = true
      ctrl.abort()
    }
  }, [basis, loc])

  // initial sync from localStorage into state (without forcing fetch twice)
  React.useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('horoscope_location') : null
      if (saved) {
        const s = JSON.parse(saved)
        if (s?.lat && s?.lon && s?.tz) setLoc({ lat: s.lat, lon: s.lon, tz: s.tz })
      }
    } catch {}
  }, [])

  return (
    <section className="my-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Daily Horoscope</h2>
        <Link href="/horoscope" className="text-indigo-600 hover:underline">View all</Link>
      </div>
      <Card className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-2">
            <Button variant={basis === 'moon_sign' ? 'default' : 'outline'} size="sm" onClick={() => setBasis('moon_sign')}>Moon sign</Button>
            <Button variant={basis === 'lagna' ? 'default' : 'outline'} size="sm" onClick={() => setBasis('lagna')}>Lagna</Button>
          </div>
          <div className="flex-1">
            <LocationSelector onSelect={(l)=> setLoc({ lat: l.lat, lon: l.lon, tz: l.tz })} />
          </div>
        </div>
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-24 rounded-md bg-gray-100 animate-pulse" />
            ))}
          </div>
        )}
        {!loading && error && (
          <div className="text-sm text-gray-600">
            Unable to load daily horoscope. You can still explore the full page.
          </div>
        )}
        {!loading && !error && items && items.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {items.map((it, idx) => (
              <Link key={idx} href={`/horoscope/${encodeURIComponent(toName(it, idx).toLowerCase())}`}
                className="block rounded-md border border-gray-200 hover:border-indigo-300 hover:shadow-sm p-3 transition-colors bg-white">
                <div className="text-sm font-semibold text-gray-900 truncate">{toName(it, idx)}</div>
                <div className="text-xs text-gray-600 mt-1 line-clamp-2">{toBlurb(it) || 'See today\'s outlook'}</div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </section>
  )
}
