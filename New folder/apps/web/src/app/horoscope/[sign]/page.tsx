"use client"
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import LocationSelector from '@/components/location-selector'
import SafeHTML from '@/components/SafeHTML'
import { z } from 'zod'

export default function SignDetail() {
  const params = useParams()
  const sign = String(params.sign || '').toUpperCase()
  const [loc, setLoc] = useState<any>(null)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|undefined>(undefined)
  const luckyFromFacts = useMemo(()=>{
    const colorByWeekday: Record<string,string> = {
      Monday:'White', Tuesday:'Red', Wednesday:'Green', Thursday:'Yellow', Friday:'Pink', Saturday:'Blue', Sunday:'Orange'
    }
    return (facts: any) => {
      const t = Number(facts?.tithi || 1)
      const weekday = String(facts?.weekday || '')
      const number = (t % 9) + 1
      const color = colorByWeekday[weekday] || 'Saffron'
      const timeSlots = ['Morning','Afternoon','Evening','Night']
      const time = timeSlots[t % timeSlots.length]
      return { number, color, time }
    }
  }, [])
  const fetchData = async (l: any) => {
    if (!l) return
    try {
      setLoading(true)
      setError(undefined)
      // Validate inputs defensively
      const schema = z.object({
        lat: z.number().gte(-90).lte(90),
        lon: z.number().gte(-180).lte(180),
        tz: z.string().min(3).max(64)
      })
      const parsed = schema.safeParse(l)
      if (!parsed.success) throw new Error('Invalid location')
      const url = new URL('/api/daily', window.location.origin)
      url.searchParams.set('basis', 'moon_sign')
      url.searchParams.set('lat', String(parsed.data.lat))
      url.searchParams.set('lon', String(parsed.data.lon))
      url.searchParams.set('tz', parsed.data.tz)
      const res = await fetch(url.toString())
      const j = await res.json()
      const cards = Array.isArray(j?.cards) ? j.cards : []
      const found = cards.find((c: any) => String(c.sign || '').toUpperCase() === sign)
      setData(found || null)
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('horoscope_location')
    if (saved) setLoc(JSON.parse(saved))
  }, [])

  useEffect(() => { if (loc) fetchData(loc) }, [loc])

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">{sign} — Daily Horoscope</h1>
      <div className="bg-white rounded shadow p-4 mb-4">
        <p className="text-sm font-semibold mb-1">Location</p>
        <LocationSelector onSelect={(l)=>{setLoc(l); fetchData(l)}} />
      </div>
      {error && <div className="mb-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
      {loading && <div className="h-24 bg-gray-100 animate-pulse rounded" />}
      {data && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-xl font-semibold mb-2">{data.title}</h2>
          <div className="text-gray-800 mb-3">
            <SafeHTML html={String(data.body_md || '')} />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <p className="text-sm font-semibold text-indigo-700">Highlights</p>
              <ul className="text-sm text-gray-700 ml-4 list-disc">
                {(data.highlights||[]).map((x: string, i: number) => (<li key={i}>{x}</li>))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-red-700">Cautions</p>
              <ul className="text-sm text-gray-700 ml-4 list-disc">
                {(data.cautions||[]).map((x: string, i: number) => (<li key={i}>{x}</li>))}
              </ul>
            </div>
          </div>
          <div className="mt-3 grid sm:grid-cols-3 gap-3">
            {(() => { const l = luckyFromFacts(data.astro_facts || {}); return (
              <>
                <div className="rounded border p-3 bg-gray-50"><p className="text-xs text-gray-500">Lucky Number</p><p className="font-semibold">{l.number}</p></div>
                <div className="rounded border p-3 bg-gray-50"><p className="text-xs text-gray-500">Lucky Color</p><p className="font-semibold">{l.color}</p></div>
                <div className="rounded border p-3 bg-gray-50"><p className="text-xs text-gray-500">Lucky Time</p><p className="font-semibold">{l.time}</p></div>
              </>
            )})()}
          </div>
          <div className="mt-3 text-sm">
            <p><span className="font-semibold">Remedy:</span> {data.remedy}</p>
            <p className="text-xs text-gray-600 mt-1">Scores — Health {data.scores?.health}, Finance {data.scores?.finance}, Career {data.scores?.career}, Love {data.scores?.love}</p>
          </div>
          <details className="mt-4">
            <summary className="text-sm text-gray-600">How we computed this</summary>
            <div className="text-xs text-gray-700 mt-2 bg-gray-50 border rounded p-3">
              <pre>{JSON.stringify(data.astro_facts, null, 2)}</pre>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
