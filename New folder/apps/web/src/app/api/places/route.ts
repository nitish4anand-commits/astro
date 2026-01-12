import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const types = searchParams.get('types') || '(cities)'
  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!q.trim()) {
    return NextResponse.json({ error: 'Missing query parameter q' }, { status: 400 })
  }
  if (!key) {
    return NextResponse.json({ error: 'Google API key not configured' }, { status: 501 })
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&types=${encodeURIComponent(types)}&key=${key}`
    const res = await fetch(url)
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: 'Upstream error', details: text }, { status: 502 })
    }
    const data = await res.json()
    return NextResponse.json({ predictions: data.predictions || [] })
  } catch (err: any) {
    return NextResponse.json({ error: 'Proxy failure', details: String(err?.message || err) }, { status: 500 })
  }
}
