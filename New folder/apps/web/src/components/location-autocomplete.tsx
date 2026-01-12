'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MapPin, Crosshair, AlertCircle } from 'lucide-react'

type Suggestion = {
  display_name: string
  lat: string
  lon: string
}

const NOMINATIM_URL = process.env.NEXT_PUBLIC_NOMINATIM_URL || 'https://nominatim.openstreetmap.org'
const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

interface Props {
  value?: string
  onSelect: (place: { name: string; lat?: number; lon?: number }) => void
}

export default function LocationAutocomplete({ value = '', onSelect }: Props) {
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const [googleReady, setGoogleReady] = useState(false)

  // Load Google Maps Places library if API key is provided
  useEffect(() => {
    if (!GOOGLE_KEY) return
    if (typeof window === 'undefined') return
    if ((window as any).google?.maps?.places) {
      setGoogleReady(true)
      return
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => setGoogleReady(true)
    script.onerror = () => setError('Failed to load Google Maps API')
    document.head.appendChild(script)
    return () => {
      document.head.removeChild(script)
    }
  }, [])

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSuggestions([])
      return
    }
    setError('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true)
        // Try server-side Google Places proxy first
        try {
          const res = await fetch(`/api/places?q=${encodeURIComponent(query)}&types=${encodeURIComponent('(cities)')}`)
          if (res.ok) {
            const data = await res.json()
            const predictions = Array.isArray(data?.predictions) ? data.predictions : []
            if (predictions.length) {
              const mapped = predictions.map((p: any) => ({
                display_name: p.description,
                lat: '',
                lon: '',
                _place_id: p.place_id,
              })) as any as Suggestion[]
              setSuggestions(mapped)
              return
            }
          }
        } catch {
          // ignore and fallback below
        }
        // Fallback to client-side Google (if script loaded), else Nominatim
        if (googleReady && (window as any).google?.maps?.places) {
          const service = new (window as any).google.maps.places.AutocompleteService()
          service.getPlacePredictions(
            { input: query, types: ['(cities)'] },
            (predictions: any[], status: string) => {
              if (status !== (window as any).google.maps.places.PlacesServiceStatus.OK || !predictions) {
                fetchNominatimSuggestions(query)
                return
              }
              const mapped = predictions.map((p) => ({
                display_name: p.description,
                lat: '',
                lon: '',
                _place_id: p.place_id,
              })) as any as Suggestion[]
              setSuggestions(mapped)
              setLoading(false)
            }
          )
        } else {
          await fetchNominatimSuggestions(query)
        }
      } catch (e: any) {
        setError(e.message || 'Unable to fetch suggestions')
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, googleReady])

  const fetchNominatimSuggestions = async (q: string) => {
    // Prefer our server proxy to avoid client CORS/rate-limits and to enrich with tz
    try {
      const res = await fetch('/api/geo/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      })
      if (res.ok) {
        const data = await res.json()
        const mapped: Suggestion[] = Array.isArray(data)
          ? data.map((d: any) => ({ display_name: d.name, lat: String(d.lat), lon: String(d.lon) }))
          : []
        setSuggestions(mapped)
        return
      }
    } catch {
      // fall through to direct nominatim
    }
    const url = `${NOMINATIM_URL}/search?q=${encodeURIComponent(q)}&format=jsonv2&addressdetails=1&limit=6`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch location suggestions')
    const data = (await res.json()) as Suggestion[]
    setSuggestions(data)
  }

  const handleSelect = async (s: Suggestion & { _place_id?: string }) => {
    setQuery(s.display_name)
    setOpen(false)
    try {
      if (s._place_id) {
        // Prefer server-side place details to avoid exposing client key
        const res = await fetch(`/api/place-details?place_id=${encodeURIComponent(s._place_id)}`)
        if (res.ok) {
          const data = await res.json()
          const name = data?.name || s.display_name
          const lat = typeof data?.lat === 'number' ? data.lat : undefined
          const lon = typeof data?.lon === 'number' ? data.lon : undefined
          onSelect({ name, lat, lon })
          return
        }
        // Fallback: client-side places details if script is ready
        if (googleReady && (window as any).google?.maps?.places) {
          const svc = new (window as any).google.maps.places.PlacesService(document.createElement('div'))
          await new Promise<void>((resolve) => {
            svc.getDetails(
              { placeId: s._place_id, fields: ['geometry', 'formatted_address'] },
              (place: any, status: string) => {
                if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
                  const lat = place.geometry.location.lat()
                  const lon = place.geometry.location.lng()
                  onSelect({ name: place.formatted_address || s.display_name, lat, lon })
                } else {
                  onSelect({ name: s.display_name })
                }
                resolve()
              }
            )
          })
          return
        }
      } else {
        onSelect({ name: s.display_name, lat: s.lat ? parseFloat(s.lat) : undefined, lon: s.lon ? parseFloat(s.lon) : undefined })
      }
    } catch (e) {
      onSelect({ name: s.display_name })
    }
  }

  const useMyLocation = async () => {
    setError('')
    setLoading(true)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        })
      })
      const { latitude, longitude } = pos.coords
      let display = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      if (googleReady && (window as any).google?.maps?.Geocoder) {
        const geocoder = new (window as any).google.maps.Geocoder()
        await new Promise<void>((resolve) => {
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results: any, status: string) => {
            if (status === 'OK' && results?.[0]) {
              display = results[0].formatted_address
            }
            resolve()
          })
        })
      } else {
        const url = `${NOMINATIM_URL}/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          display = data?.display_name || display
        }
      }
      setQuery(display)
      onSelect({ name: display, lat: latitude, lon: longitude })
    } catch (e: any) {
      setError(e?.message || 'Unable to get current location. Please allow location permissions.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          id="place"
          type="text"
          required
          placeholder="City, Country"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
        <Button type="button" variant="secondary" onClick={useMyLocation} disabled={loading}>
          <Crosshair className="h-4 w-4 mr-1" /> Use my location
        </Button>
      </div>

      {error && (
        <div className="flex items-center text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mr-2" /> {error}
        </div>
      )}

      {open && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((s) => (
            <button
              key={`${s.display_name}-${s.lat || ''}-${s.lon || ''}`}
              type="button"
              onClick={() => handleSelect(s)}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              <span className="inline-flex items-center"><MapPin className="h-4 w-4 mr-2" />{s.display_name}</span>
              {s.lat && s.lon ? (
                <span className="block text-xs text-gray-500">Lat {parseFloat(s.lat).toFixed(4)}, Lon {parseFloat(s.lon).toFixed(4)}</span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center text-xs text-gray-500">
        <span>Start typing to search globally or click "Use my location".</span>
        <span className="ml-2">{googleReady ? 'Powered by Google' : 'Using global open data'}</span>
      </div>
    </div>
  )
}
