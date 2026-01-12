"use client"
import { useEffect, useState } from 'react'
import LocationSelector from '@/components/location-selector'
import Link from 'next/link'

type Card = { sign: string; title: string; body_md: string; scores: any }

const SIGN_ICONS: Record<string,string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
  Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓'
}

export default function HoroscopePage() {
  const [loc, setLoc] = useState<any>(null)
  const [basis, setBasis] = useState<'moon_sign'|'sun_sign'|'lagna'>('moon_sign')
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|undefined>(undefined)

  const fetchData = async (l: any, b: string) => {
    if (!l) return
    try {
      setLoading(true)
      setError(undefined)
      const url = new URL('/api/horoscope/today', process.env.NEXT_PUBLIC_API_URL)
      url.searchParams.set('basis', b)
      url.searchParams.set('lat', String(l.lat))
      url.searchParams.set('lon', String(l.lon))
      url.searchParams.set('tz', l.tz)
      const res = await fetch(url.toString())
      const data = await res.json()
      setCards(data.cards || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (loc) fetchData(loc, basis)
  }, [loc, basis])

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white p-6 mb-5">
        <h1 className="text-3xl md:text-4xl font-extrabold">Daily Horoscope</h1>
        <p className="opacity-90 mt-1 text-sm">Your Vedic daily predictions by sign. Powered by local sunrise and panchang.</p>
        <div className="mt-3 flex gap-2 text-xs">
          <span className="bg-white/20 px-2 py-1 rounded">Daily</span>
          <span className="px-2 py-1 rounded border border-white/30 opacity-80">Weekly (soon)</span>
          <span className="px-2 py-1 rounded border border-white/30 opacity-80">Monthly (soon)</span>
        </div>
      </div>
      <div className="bg-white rounded shadow p-4 mb-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold mb-1">Location</p>
            <LocationSelector onSelect={setLoc} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-1">Horoscope Basis</p>
            <div className="flex gap-2">
              {(['moon_sign','sun_sign','lagna'] as const).map(b => (
                <button key={b} onClick={()=>setBasis(b)} className={`px-3 py-1 rounded border ${basis===b? 'bg-indigo-600 text-white border-indigo-600':'bg-white text-gray-800'}`}>{b.replace('_',' ').toUpperCase()}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {error && <div className="mb-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
      {basis !== 'lagna' ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {loading ? (
            [...Array(6)].map((_,i)=>(<div key={i} className="h-28 bg-gray-100 animate-pulse rounded" />))
          ) : (
            cards.map((c) => (
              <Link href={`/horoscope/${c.sign.toLowerCase()}`} key={c.sign} className="border rounded p-3 hover:shadow transition bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{SIGN_ICONS[c.sign] || '⭐'}</span>
                    <p className="font-semibold">{c.sign}</p>
                  </div>
                  <div className="text-xs text-gray-600">H {c.scores?.health} • F {c.scores?.finance} • C {c.scores?.career} • L {c.scores?.love}</div>
                </div>
                <p className="text-sm text-gray-700 mt-2 line-clamp-3">{c.body_md}</p>
                <div className="mt-2 text-xs text-gray-600">Lucky color: <span className="font-medium">{(() => {
                  const weekday = (c as any)?.astro_facts?.weekday || ''
                  const map: any = { Monday:'White', Tuesday:'Red', Wednesday:'Green', Thursday:'Yellow', Friday:'Pink', Saturday:'Blue', Sunday:'Orange' }
                  return map[weekday] || 'Saffron'
                })()}</span></div>
              </Link>
            ))
          )}
        </div>
      ) : (
        <div className="border rounded p-4">Select Lagna to view a single location-aware result on the Lagna page.</div>
      )}
      <div className="mt-6 text-xs text-gray-600">
        <p>AstroKundli Daily Horoscope uses Vedic calculations at local sunrise (panchang: tithi, nakshatra) and sidereal placements.</p>
      </div>
    </div>
  )
}
