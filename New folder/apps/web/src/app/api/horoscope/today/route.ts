import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const basis = searchParams.get('basis') || 'moon_sign'
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')
    const tz = searchParams.get('tz')
    if (!lat || !lon || !tz) {
      return NextResponse.json({ error: 'lat, lon, tz required' }, { status: 400 })
    }
    const base = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const url = `${base}/api/horoscope/today?basis=${encodeURIComponent(basis)}&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&tz=${encodeURIComponent(tz)}`
    const res = await fetch(url, { next: { revalidate: 0 } })
    const text = await res.text()
    return new NextResponse(text, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'fetch failed' }, { status: 500 })
  }
}
