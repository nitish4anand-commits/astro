import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const placeId = searchParams.get('place_id') || ''
  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!placeId.trim()) {
    return NextResponse.json({ error: 'Missing place_id parameter' }, { status: 400 })
  }
  if (!key) {
    return NextResponse.json({ error: 'Google API key not configured' }, { status: 501 })
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry,formatted_address&key=${key}`
    const res = await fetch(url)
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: 'Upstream error', details: text }, { status: 502 })
    }
    const data = await res.json()
    const loc = data?.result?.geometry?.location
    const formatted = data?.result?.formatted_address
    if (!loc) {
      return NextResponse.json({ error: 'No geometry in place details' }, { status: 404 })
    }
    return NextResponse.json({ lat: loc.lat, lon: loc.lng, name: formatted || '' })
  } catch (err: any) {
    return NextResponse.json({ error: 'Proxy failure', details: String(err?.message || err) }, { status: 500 })
  }
}
