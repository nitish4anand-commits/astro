"use client"
import { useEffect, useState } from 'react'
import LocationSelector from '@/components/location-selector'

export default function LagnaPage() {
  const [loc, setLoc] = useState<any>(null)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|undefined>(undefined)

  const fetchData = async (l: any) => {
    if (!l) return
    try {
      setLoading(true)
      setError(undefined)
      const url = new URL('/api/horoscope/today', process.env.NEXT_PUBLIC_API_URL)
      url.searchParams.set('basis', 'lagna')
      url.searchParams.set('lat', String(l.lat))
      url.searchParams.set('lon', String(l.lon))
      url.searchParams.set('tz', l.tz)
      const res = await fetch(url.toString())
      const j = await res.json()
      setData(j)
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
      <h1 className="text-3xl font-bold mb-4">Lagna — Location-Aware</h1>
      <div className="bg-white rounded shadow p-4 mb-4">
        <p className="text-sm font-semibold mb-1">Location</p>
        <LocationSelector onSelect={(l)=>{setLoc(l); fetchData(l)}} />
      </div>
      {error && <div className="mb-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
      {loading && <div className="h-24 bg-gray-100 animate-pulse rounded" />}
      {data && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-xl font-semibold mb-2">{data.title}</h2>
          <p className="text-gray-800 mb-3">{data.body_md}</p>
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
          <div className="mt-3 text-sm">
            <p><span className="font-semibold">Remedy:</span> {data.remedy}</p>
            <p className="text-xs text-gray-600 mt-1">Scores — Health {data.scores?.health}, Finance {data.scores?.finance}, Career {data.scores?.career}, Love {data.scores?.love}</p>
            <p className="text-xs text-gray-600 mt-1">Current Lagna: {data.lagna_sign} • Next change: {data.next_change}</p>
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
