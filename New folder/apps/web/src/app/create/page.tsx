"use client"

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { createChart, calculateDasha, calculateTransits, generatePredictions, getDashaInsights } from '@/lib/api'
import { Star, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import LocationAutocomplete from '@/components/location-autocomplete'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

// Replaced static city list with global autocomplete

const schema = z.object({
  name: z.string().min(1, 'Please enter your full name').max(200),
  local_datetime: z.string().min(1, 'Please enter birth date & time'),
  unknown_time: z.boolean().optional().default(false),
  place: z.string().min(2, 'Please enter a valid place'),
  lat: z.string().optional(),
  lon: z.string().optional(),
  timezone: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function CreateKundli() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const defaultTz = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || '' } catch { return '' }
  }, [])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      local_datetime: '',
      place: '',
      lat: '',
      lon: '',
      timezone: defaultTz,
      unknown_time: false,
    },
  })

  const resolveLatLonIfMissing = async (values: FormValues) => {
    if (values.lat && values.lon) return values
    if (!values.place || values.place.trim().length < 2) return values
    // Try server-side Google Places proxy first
    try {
      const resPred = await fetch(`/api/places?q=${encodeURIComponent(values.place)}&types=${encodeURIComponent('(cities)')}`)
      if (resPred.ok) {
        const data = await resPred.json()
        const first = Array.isArray(data?.predictions) && data.predictions[0]
        if (first?.place_id) {
          const det = await fetch(`/api/place-details?place_id=${encodeURIComponent(first.place_id)}`)
          if (det.ok) {
            const d = await det.json()
            if (typeof d?.lat === 'number' && typeof d?.lon === 'number') {
              values.lat = String(d.lat)
              values.lon = String(d.lon)
            }
            if (d?.name) {
              values.place = d.name
            }
            return values
          }
        }
      }
    } catch {}
    // Fallback: Nominatim
    try {
      const url = `${process.env.NEXT_PUBLIC_NOMINATIM_URL || 'https://nominatim.openstreetmap.org'}/search?q=${encodeURIComponent(values.place)}&format=jsonv2&addressdetails=1&limit=1`
      const res = await fetch(url)
      if (res.ok) {
        const arr = await res.json()
        const item = Array.isArray(arr) ? arr[0] : null
        if (item?.lat && item?.lon) {
          values.lat = String(item.lat)
          values.lon = String(item.lon)
        }
      }
    } catch {}
    return values
  }

  const onSubmit = async (values: FormValues) => {
    setError('')
    try {
      values = await resolveLatLonIfMissing(values)
      const datetime = new Date(values.local_datetime)
      const payload = {
        name: values.name,
        local_datetime: datetime.toISOString(),
        place: values.place,
        lat: values.lat ? parseFloat(values.lat) : undefined,
        lon: values.lon ? parseFloat(values.lon) : undefined,
        timezone: values.timezone || undefined,
        unknown_time: !!values.unknown_time,
      }
      const chart = await createChart(payload)
      // Fetch dashas and predictions to populate dashboard tabs
      let dashas: any[] | undefined
      let predictions: any | undefined
      let transits: any[] | undefined
      let dasha_insights: any | undefined
      let summary: any | undefined
      try {
        const dashaRes = await calculateDasha(payload)
        dashas = dashaRes?.dashas
      } catch (e) {
        console.warn('Failed to calculate dashas:', e)
      }
      try {
        const predRes = await generatePredictions(payload)
        predictions = predRes?.predictions
        summary = predRes?.summary
      } catch (e) {
        console.warn('Failed to generate predictions:', e)
      }
      try {
        const transRes = await calculateTransits(payload)
        transits = transRes?.transits
      } catch (e) {
        console.warn('Failed to calculate transits:', e)
      }
      try {
        const insightsRes = await getDashaInsights(payload)
        dasha_insights = insightsRes?.insights
      } catch (e) {
        console.warn('Failed to fetch dasha insights:', e)
      }
      const combined = { ...chart, dashas, predictions, summary, transits, dasha_insights }
      sessionStorage.setItem('currentChart', JSON.stringify(combined))
      setSuccess(true)
      setTimeout(() => router.push('/kundli'), 800)
    } catch (err: any) {
      setError(err.message || 'Failed to create kundli. Please try again.')
    }
  }

  const onSelectPlace = (place: { name: string; lat?: number; lon?: number }) => {
    form.setValue('place', place.name, { shouldValidate: true })
    if (place.lat !== undefined) form.setValue('lat', String(place.lat))
    if (place.lon !== undefined) form.setValue('lon', String(place.lon))
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <Star className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-2xl font-bold text-indigo-600">Astro Kundli</span>
            </Link>
            <Link href="/">
              <Button variant="ghost">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Form */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Create Your Kundli</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6 flex items-center">
                  <CheckCircle2 className="h-5 w-5 mr-2" /> Kundli created successfully. Redirecting...
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" role="form">
                  <section aria-labelledby="single-form">
                    <h2 id="single-form" className="sr-only">Create Kundli</h2>
                    <FormField name="name" control={form.control} render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField name="local_datetime" control={form.control} render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>Birth date and time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField name="place" control={form.control} render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>Place of Birth</FormLabel>
                        <FormControl>
                          <LocationAutocomplete value={field.value} onSelect={(p) => { field.onChange(p.name); onSelectPlace(p) }} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Hidden optional fields retained for accuracy */}
                    <input type="hidden" value={form.getValues('lat') || ''} readOnly />
                    <input type="hidden" value={form.getValues('lon') || ''} readOnly />
                    <input type="hidden" value={form.getValues('timezone') || ''} readOnly />
                  </section>

                  <div className="flex justify-end">
                    <Button type="submit">Create Kundli</Button>
                  </div>
                </form>
              </Form>
            </div>
          </CardContent>
        </Card>

        {/* Info Box */}
        <div className="mt-8 bg-indigo-50 border border-indigo-200 rounded-lg p-6">
          <h3 className="font-semibold text-indigo-900 mb-2">Tip</h3>
          <ul className="text-sm text-indigo-800 space-y-1">
            <li>• Use local birth time; location helps compute ascendant precisely.</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
