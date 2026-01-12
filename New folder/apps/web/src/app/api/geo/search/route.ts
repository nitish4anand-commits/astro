import { NextResponse } from 'next/server'
import { z } from 'zod'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const Schema = z.object({ query: z.string().trim().min(2).max(200) })
    const parsed = Schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'invalid query' }, { status: 400 })
    const base = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL
    const res = await fetch(base + '/api/geo/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: parsed.data.query }),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'search failed' }, { status: 500 })
  }
}
