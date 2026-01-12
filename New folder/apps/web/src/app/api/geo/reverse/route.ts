import { NextResponse } from 'next/server'
import { z } from 'zod'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const Schema = z.object({ lat: z.number().gte(-90).lte(90), lon: z.number().gte(-180).lte(180) })
    const parsed = Schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'invalid coordinates' }, { status: 400 })
    const base = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL
    const res = await fetch(base + '/api/geo/reverse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: parsed.data.lat, lon: parsed.data.lon }),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'reverse failed' }, { status: 500 })
  }
}
