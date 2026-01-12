import { NextResponse } from 'next/server'
import { z } from 'zod'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const Schema = z.object({
      basis: z.enum(['moon_sign','lagna','sun_sign']).default('moon_sign'),
      lat: z.coerce.number().gte(-90).lte(90),
      lon: z.coerce.number().gte(-180).lte(180),
      tz: z.string().min(3).max(64).default('UTC')
    })
    const parsed = Schema.safeParse({
      basis: searchParams.get('basis') || 'moon_sign',
      lat: searchParams.get('lat'),
      lon: searchParams.get('lon'),
      tz: searchParams.get('tz') || 'UTC'
    })
    if (!parsed.success) return NextResponse.json({ error: 'invalid params' }, { status: 400 })
    const base = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const { basis, lat, lon, tz } = parsed.data
    const url = `${base}/api/horoscope/today?basis=${encodeURIComponent(basis)}&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}&tz=${encodeURIComponent(tz)}`
    const res = await fetch(url, { next: { revalidate: 0 } })
    const text = await res.text()
    return new NextResponse(text, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'fetch failed' }, { status: 500 })
  }
}
