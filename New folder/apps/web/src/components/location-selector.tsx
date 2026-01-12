"use client"
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

type Location = { name: string; lat: number; lon: number; tz: string }

export default function LocationSelector({ onSelect }: { onSelect: (loc: Location) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Location | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [gReady, setGReady] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('horoscope_location')
    if (saved) setSelected(JSON.parse(saved))
  }, [])

  const search = async () => {
    if (!query.trim()) return
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/geo/search', { method: 'POST', body: JSON.stringify({ query }), headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      setResults(data)
    } catch (e: any) {
      setError(e?.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  // Typeahead suggestions with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query || query.trim().length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      try {
        setError(null)
        const res = await fetch('/api/geo/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        })
        if (res.ok) {
          const data = await res.json()
          setResults(Array.isArray(data) ? data : [])
        }
      } catch (e: any) {
        // silent; button still available
      }
    }, 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const useMyLocation = async () => {
    try {
      setLoading(true)
      setError(null)
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject))
      const lat = pos.coords.latitude
      const lon = pos.coords.longitude
      const res = await fetch('/api/geo/reverse', { method: 'POST', body: JSON.stringify({ lat, lon }), headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      setSelected(data)
      localStorage.setItem('horoscope_location', JSON.stringify(data))
      onSelect(data)
    } catch (e: any) {
      setError('Unable to get location')
    } finally {
      setLoading(false)
    }
  }

  const choose = (loc: Location) => {
    setSelected(loc)
    localStorage.setItem('horoscope_location', JSON.stringify(loc))
    onSelect(loc)
  }

  // Optional: Google Places Autocomplete if API key is present
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!key) return
    if (typeof window === 'undefined') return
    if ((window as any).google?.maps?.places) { setGReady(true); return }
    const id = 'google-maps-places'
    if (document.getElementById(id)) return
    const s = document.createElement('script')
    s.id = id
    s.async = true
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async`
    s.onload = () => setGReady(true)
    document.head.appendChild(s)
  }, [])

  useEffect(() => {
    if (!gReady) return
    if (!inputRef.current) return
    const g = (window as any).google
    if (!g?.maps?.places) return
    const autocomplete = new g.maps.places.Autocomplete(inputRef.current, {
      fields: ['geometry', 'formatted_address', 'name']
    })
    const handler = async () => {
      const place = autocomplete.getPlace()
      const loc = place?.geometry?.location
      if (!loc) return
      const lat = loc.lat()
      const lon = loc.lng()
      try {
        setLoading(true)
        const res = await fetch('/api/geo/reverse', { method: 'POST', body: JSON.stringify({ lat, lon }), headers: { 'Content-Type': 'application/json' } })
        const data = await res.json()
        const merged: Location = { name: place.formatted_address || place.name || data.name, lat, lon, tz: data.tz }
        setSelected(merged)
        localStorage.setItem('horoscope_location', JSON.stringify(merged))
        onSelect(merged)
        setResults([])
      } catch (e) {
        // Silently ignore, user can fallback to search
      } finally {
        setLoading(false)
      }
    }
    autocomplete.addListener('place_changed', handler)
    return () => { g.event?.clearInstanceListeners?.(autocomplete) }
  }, [gReady])

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input ref={inputRef} className="border rounded px-2 py-1 flex-1" value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="City, Country" />
        <Button onClick={search} disabled={loading}>{loading ? 'Searching…' : 'Search'}</Button>
        <Button variant="outline" onClick={useMyLocation} disabled={loading}>Use my location</Button>
      </div>
      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
      {selected && (
        <div className="text-sm text-gray-700">Selected: <span className="font-semibold">{selected.name}</span> ({selected.tz})</div>
      )}
      {results.length > 0 && (
        <div className="border rounded divide-y">
          {results.map((r, i) => (
            <button key={i} onClick={() => choose(r)} className="w-full text-left px-3 py-2 hover:bg-gray-50">
              <div className="font-semibold">{r.name}</div>
              <div className="text-xs text-gray-600">{r.lat.toFixed(2)}, {r.lon.toFixed(2)} • {r.tz}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
