'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { calculateTransits, generatePredictions, calculateDasha } from '@/lib/api'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Star, ArrowLeft, Share2, Download } from 'lucide-react'
import { getMahadashaImplications, getAntardashaModifiers, getMahadashaDetails, getCombinationNote, getAntardashaDetails, getMahadashaContextNotes } from '@/lib/dasha'
import ChartSVG from '@/components/ChartSVG'
import ChartSVGNavamsa from '@/components/ChartSVGNavamsa'
import { detectMangalDosha, getMangalDoshaDescription, getMangalDoshaRemedies } from '@/lib/doshas'

export default function KundliPage() {
  const [chartData, setChartData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load chart data from sessionStorage
    const stored = sessionStorage.getItem('currentChart')
    if (stored) {
      setChartData(JSON.parse(stored))
    }
    setLoading(false)
  }, [])

  // Always derive data with safe fallbacks to keep hooks order stable
  const { input_echo, vedic, astronomy, dashas, predictions, summary, transits, dasha_insights } = chartData || {}
  const [transitsState, setTransitsState] = useState<any[]>(Array.isArray(transits) ? transits : [])
  const [dashasState, setDashasState] = useState<any[]>(Array.isArray(dashas) ? dashas : [])
  const [predictionsState, setPredictionsState] = useState<any>(predictions || { now: [], next_90_days: [], next_12_months: [] })
  const [summaryState, setSummaryState] = useState<any>(summary || { now: {}, next_90_days: {}, next_12_months: {} })
  const [isRefreshingDashas, setIsRefreshingDashas] = useState(false)
  const [isRefreshingPredictions, setIsRefreshingPredictions] = useState(false)
  const [transitDate, setTransitDate] = useState<string>('')
  const [transitLoading, setTransitLoading] = useState(false)
  const [transitError, setTransitError] = useState<string|undefined>(undefined)
  const [dashasError, setDashasError] = useState<string|undefined>(undefined)
  const [predictionsError, setPredictionsError] = useState<string|undefined>(undefined)
  const [transitsUpdatedAt, setTransitsUpdatedAt] = useState<string | null>(null)
  const [refFrom, setRefFrom] = useState<'moon' | 'lagna'>('moon')
  const [toasts, setToasts] = useState<Array<{ id: number; type: 'success' | 'error'; message: string }>>([])

  const showToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  // Keep transits state in sync when chart data arrives/changes
  useEffect(() => {
    setTransitsState(Array.isArray(transits) ? transits : [])
    if (Array.isArray(transits) && transits.length && !transitsUpdatedAt) {
      setTransitsUpdatedAt(new Date().toISOString())
    }
  }, [transits])
  useEffect(() => {
    setDashasState(Array.isArray(dashas) ? dashas : [])
  }, [dashas])
  useEffect(() => {
    setPredictionsState(predictions || { now: [], next_90_days: [], next_12_months: [] })
    setSummaryState(summary || { now: {}, next_90_days: {}, next_12_months: {} })
  }, [predictions, summary])

  const refreshTransits = async () => {
    try {
      setTransitError(undefined)
      setTransitLoading(true)
      let dateParam: string | undefined
      if (transitDate) {
        // Normalize to midday to avoid timezone edge cases
        dateParam = `${transitDate}T12:00:00`
      }
      const res = await calculateTransits(input_echo, dateParam)
      const fresh = res?.transits || []
      setTransitsState(fresh)
      setTransitsUpdatedAt(new Date().toISOString())
      // Persist to session so a reload retains the latest view
      const stored = sessionStorage.getItem('currentChart')
      if (stored) {
        const obj = JSON.parse(stored)
        obj.transits = fresh
        obj.transits_last_updated = new Date().toISOString()
        sessionStorage.setItem('currentChart', JSON.stringify(obj))
      }
    } catch (e: any) {
      setTransitError(e?.message || 'Failed to refresh transits')
    } finally {
      setTransitLoading(false)
    }
  }

  const refreshDashas = async () => {
    try {
      setIsRefreshingDashas(true)
      setDashasError(undefined)
      const res = await calculateDasha(input_echo)
      const fresh = res?.dashas || []
      setDashasState(fresh)
      const stored = sessionStorage.getItem('currentChart')
      if (stored) {
        const obj = JSON.parse(stored)
        obj.dashas = fresh
        sessionStorage.setItem('currentChart', JSON.stringify(obj))
      }
      showToast('success', 'Dashas updated')
    } catch (e: any) {
      const msg = e?.message || 'Failed to refresh dashas'
      setDashasError(msg)
      showToast('error', msg)
    } finally {
      setIsRefreshingDashas(false)
    }
  }

  const refreshPredictions = async () => {
    try {
      setIsRefreshingPredictions(true)
      setPredictionsError(undefined)
      const res = await generatePredictions(input_echo)
      const freshPreds = res?.predictions || { now: [], next_90_days: [], next_12_months: [] }
      const freshSummary = res?.summary || { now: {}, next_90_days: {}, next_12_months: {} }
      setPredictionsState(freshPreds)
      setSummaryState(freshSummary)
      const stored = sessionStorage.getItem('currentChart')
      if (stored) {
        const obj = JSON.parse(stored)
        obj.predictions = freshPreds
        obj.summary = freshSummary
        sessionStorage.setItem('currentChart', JSON.stringify(obj))
      }
      showToast('success', 'Predictions updated')
    } catch (e: any) {
      const msg = e?.message || 'Failed to refresh predictions'
      setPredictionsError(msg)
      showToast('error', msg)
    } finally {
      setIsRefreshingPredictions(false)
    }
  }

  // Conditional skeletons/rendering after all hooks to preserve order
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
          <div className="h-10 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="grid grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!chartData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No chart data found</p>
          <Link href="/create">
            <Button>Create a Kundli</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <Star className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-2xl font-bold text-indigo-600">Astro Kundli</span>
            </Link>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Link href="/kundli/print" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/create">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Create
          </Button>
        </Link>

        <h1 className="text-3xl font-bold mb-6">Your Kundli Dashboard</h1>

        {/* Birth Details Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Birth Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 font-semibold">Name</p>
              <p className="text-lg">{input_echo.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-semibold">Date & Time</p>
              <p className="text-lg">
                {new Date(input_echo.local_datetime).toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-semibold">Place</p>
              <p className="text-lg">{input_echo.place}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-semibold">Timezone</p>
              <p className="text-lg">{input_echo.timezone || 'Auto-detected'}</p>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500 font-semibold">Lagna (Ascendant)</p>
                <p className="text-lg text-indigo-600 font-semibold">{vedic.lagna_rashi}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-semibold">Lagna Lord</p>
                <p className="text-lg text-indigo-600 font-semibold">{vedic.lagna_lord}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-semibold">Ayanamsa</p>
                <p className="text-lg">Lahiri ({vedic.ayanamsa.toFixed(2)}°)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="chart" className="space-y-6">
          <div className="sticky top-16 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
            <div className="max-w-7xl mx-auto">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="chart">Chart</TabsTrigger>
                <TabsTrigger value="planets">Planets</TabsTrigger>
                <TabsTrigger value="dashas">Dashas</TabsTrigger>
                <TabsTrigger value="transits">Gochar</TabsTrigger>
                <TabsTrigger value="predictions">Predictions</TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* Chart Tab */}
          <TabsContent value="chart" className="animate-in fade-in-50 duration-200">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">D1 (Rashi) Chart</h2>
              <div className="flex items-center justify-center mb-4">
                <ChartSVG d1={vedic.d1_chart} />
              </div>
              <div className="grid md:grid-cols-12 gap-4">
                {Object.entries(vedic.d1_chart).map(([house, planets]: [string, any]) => (
                  <div
                    key={house}
                    className="border-2 border-gray-300 rounded p-3 min-h-[100px] bg-indigo-50"
                  >
                    <p className="text-xs font-bold text-gray-500 mb-1">House {house}</p>
                    <div className="space-y-1">
                      {planets.map((planet: string) => (
                        <p key={planet} className="text-sm font-semibold text-indigo-700">
                          {planet}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-4">
                * Preview chart is illustrative; full North/South Indian visuals coming soon
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h2 className="text-2xl font-semibold mb-4">D9 (Navamsa) Chart</h2>
              <div className="flex items-center justify-center mb-4">
                <ChartSVGNavamsa d9={vedic.d9_chart || {}} />
              </div>
              <p className="text-sm text-gray-500">
                * Navamsa chart preview is indicative. Detailed divisional charts are planned.
              </p>
            </div>
          </TabsContent>

          {/* Planets Tab */}
          <TabsContent value="planets" className="animate-in fade-in-50 duration-200">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">Planetary Positions (Sidereal)</h2>
              <div className="space-y-3">
                {vedic.planets.map((planet: any) => (
                  <div
                    key={planet.name}
                    className="flex justify-between items-center border-b pb-2"
                  >
                    <div>
                      <p className="font-semibold">{planet.name}</p>
                      <p className="text-sm text-gray-600">
                        {planet.nakshatra} ({planet.pada})
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-indigo-600">
                        {planet.degree}° {planet.minute}' {planet.rashi}
                      </p>
                      <p className="text-sm text-gray-600">Lord: {planet.rashi_lord}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Dashas Tab */}
          <TabsContent value="dashas" className="animate-in fade-in-50 duration-200">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">Vimshottari Dasha</h2>
              <p className="text-sm text-gray-600 mb-4">
                Dasha indicates time periods governed by planetary themes. Mahadasha sets the overall tone,
                while Antardasha refines focus. Use this as a supportive guide; results depend on individual charts.
              </p>
              {dashasError && (
                <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{dashasError}</div>
              )}
              <div className="flex items-center justify-end mb-2">
                <Button size="sm" variant="outline" onClick={refreshDashas} disabled={isRefreshingDashas}>{isRefreshingDashas ? 'Refreshing…' : 'Refresh Dashas'}</Button>
              </div>
              {dashasState && dashasState.length > 0 ? (
                <div className="space-y-4">
                  {dashasState
                    .filter((d: any) => d.level === 'Maha')
                    .map((dasha: any) => (
                      <div
                        key={dasha.planet + dasha.start_date}
                        className={`p-4 rounded-lg border-2 ${
                          dasha.current
                            ? 'bg-indigo-50 border-indigo-300'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-bold text-lg">
                            {dasha.planet} Mahadasha
                            {dasha.current && (
                              <span className="ml-2 text-xs bg-indigo-600 text-white px-2 py-1 rounded">
                                Current
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {dasha.duration_years.toFixed(1)} years
                          </p>
                        </div>
                        <p className="text-sm text-gray-600">
                          {new Date(dasha.start_date).toLocaleDateString('en-IN')} -{' '}
                          {new Date(dasha.end_date).toLocaleDateString('en-IN')}
                        </p>
                        {/* Implications */}
                        <div className="mt-3">
                          <p className="text-sm font-semibold text-indigo-700">Implications</p>
                          <ul className="text-sm text-gray-700 ml-4 list-disc">
                            {getMahadashaImplications(dasha.planet).map((line: string, i: number) => (
                              <li key={i}>{line}</li>
                            ))}
                          </ul>
                        </div>
                        {/* Context Notes */}
                        {(() => {
                          const ctx = getMahadashaContextNotes(
                            dasha.planet,
                            vedic.d1_chart,
                            vedic.lagna_lord,
                            vedic.planets?.map((p: any) => ({ name: p.name, rashi: p.rashi, rashi_lord: p.rashi_lord }))
                          )
                          return (
                            <div className="mt-2">
                              <p className="text-sm font-semibold text-indigo-700">Context</p>
                              <ul className="text-sm text-gray-700 ml-4 list-disc">
                                {ctx.slice(0,3).map((c, i) => (<li key={i}>{c}</li>))}
                              </ul>
                            </div>
                          )
                        })()}
                        {/* Detailed description */}
                        {(() => {
                          const details = getMahadashaDetails(dasha.planet)
                          if (!details) return null
                          return (
                            <div className="mt-3 grid md:grid-cols-3 gap-3">
                              <div className="md:col-span-3">
                                <p className="text-sm text-gray-700">{details.overview}</p>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-green-700">Strengths</p>
                                <ul className="text-sm text-gray-700 ml-4 list-disc">
                                  {details.strengths.map((s, i) => (<li key={i}>{s}</li>))}
                                </ul>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-red-700">Challenges</p>
                                <ul className="text-sm text-gray-700 ml-4 list-disc">
                                  {details.challenges.map((c, i) => (<li key={i}>{c}</li>))}
                                </ul>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-indigo-700">Remedies</p>
                                <ul className="text-sm text-gray-700 ml-4 list-disc">
                                  {details.remedies.map((r, i) => (<li key={i}>{r}</li>))}
                                </ul>
                              </div>
                            </div>
                          )
                        })()}
                        {dasha.current && (
                          <div className="mt-3">
                            <p className="text-sm font-semibold text-indigo-700">Current Antardasha focus</p>
                            {(() => {
                              const currentAntar = (dashasState as any[]).find(
                                (d) => d.level === 'Antar' && d.current && String(d.planet).startsWith(`${dasha.planet}/`)
                              )
                              const antarLord = currentAntar ? String(currentAntar.planet).split('/')[1] : undefined
                              const modifiers = antarLord ? getAntardashaModifiers(antarLord) : []
                              const combo = antarLord ? getCombinationNote(dasha.planet, antarLord) : null
                              return (
                                <div className="space-y-2">
                                  {modifiers.length ? (
                                    <ul className="text-sm text-gray-700 ml-4 list-disc">
                                      {modifiers.map((m: string, i: number) => (
                                        <li key={i}>{m}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-sm text-gray-600">No specific modifiers active.</p>
                                  )}
                                  {combo && (
                                    <p className="text-xs text-gray-600">Note: {combo}</p>
                                  )}
                                  {(() => {
                                    const det = getMahadashaDetails(dasha.planet)
                                    if (!det) return null
                                    return (
                                      <div className="mt-2">
                                        <p className="text-sm font-semibold text-indigo-700">Suggested Remedies</p>
                                        <ul className="text-sm text-gray-700 ml-4 list-disc">
                                          {det.remedies.slice(0,3).map((r, i) => (<li key={i}>{r}</li>))}
                                        </ul>
                                      </div>
                                    )
                                  })()}
                                  {(() => {
                                    if (!antarLord) return null
                                    const ad = getAntardashaDetails(antarLord)
                                    if (!ad) return null
                                    return (
                                      <div className="mt-2">
                                        <p className="text-sm font-semibold text-indigo-700">Antardasha Details</p>
                                        <p className="text-xs text-gray-700">{ad.overview}</p>
                                        <div className="grid md:grid-cols-3 gap-2 mt-2">
                                          <div>
                                            <p className="text-xs font-semibold text-green-700">Strengths</p>
                                            <ul className="text-xs text-gray-700 ml-4 list-disc">
                                              {ad.strengths.slice(0,2).map((s, i) => (<li key={i}>{s}</li>))}
                                            </ul>
                                          </div>
                                          <div>
                                            <p className="text-xs font-semibold text-red-700">Challenges</p>
                                            <ul className="text-xs text-gray-700 ml-4 list-disc">
                                              {ad.challenges.slice(0,2).map((c, i) => (<li key={i}>{c}</li>))}
                                            </ul>
                                          </div>
                                          <div>
                                            <p className="text-xs font-semibold text-indigo-700">Remedies</p>
                                            <ul className="text-xs text-gray-700 ml-4 list-disc">
                                              {ad.remedies.slice(0,2).map((r, i) => (<li key={i}>{r}</li>))}
                                            </ul>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })()}
                                </div>
                              )
                            })()}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-600">Dasha data not available</p>
              )}

              {/* Personalized Insights */}
              {dasha_insights && (
                <div className="mt-6">
                  <h3 className="text-xl font-semibold mb-2">Personalized Insights</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="border p-4 rounded">
                      <p className="text-sm text-gray-600 font-semibold">Mahadasha ({dasha_insights.mahadasha?.planet || '—'})</p>
                      <ul className="text-sm text-gray-700 ml-4 list-disc">
                        {(dasha_insights.mahadasha?.themes || []).map((t: string, i: number) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                      {dasha_insights.mahadasha?.nakshatra && (
                        <p className="text-xs text-gray-600 mt-2">Nakshatra: {dasha_insights.mahadasha.nakshatra}</p>
                      )}
                    </div>
                    <div className="border p-4 rounded">
                      <p className="text-sm text-gray-600 font-semibold">Antardasha ({dasha_insights.antardasha?.planet || '—'})</p>
                      <ul className="text-sm text-gray-700 ml-4 list-disc">
                        {(dasha_insights.antardasha?.themes || []).map((t: string, i: number) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                      {dasha_insights.antardasha?.nakshatra && (
                        <p className="text-xs text-gray-600 mt-2">Nakshatra: {dasha_insights.antardasha.nakshatra}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {/* Dasha Guide */}
              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-2">Dasha Guide</h3>
                <p className="text-sm text-gray-600 mb-3">A concise guide to each Mahadasha’s tone. Use alongside personalized insights.</p>
                <div className="grid md:grid-cols-3 gap-3">
                  {['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'].map((p) => {
                    const d = getMahadashaDetails(p)
                    if (!d) return null
                    return (
                      <div key={p} className="border rounded p-3">
                        <p className="font-semibold text-indigo-700 mb-1">{p}</p>
                        <p className="text-xs text-gray-700 mb-2">{d.overview}</p>
                        <ul className="text-xs text-gray-700 ml-4 list-disc">
                          {d.strengths.slice(0,2).map((s, i) => (<li key={i}>{s}</li>))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Transits Tab */}
          <TabsContent value="transits" className="animate-in fade-in-50 duration-200">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <h2 className="text-2xl font-semibold">Current Transits (Gochar)</h2>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={transitDate}
                    onChange={(e) => setTransitDate(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                    aria-label="Select transit date"
                  />
                  <Button size="sm" onClick={refreshTransits} disabled={transitLoading}>
                    {transitLoading ? 'Refreshing…' : 'Refresh'}
                  </Button>
                  <div className="ml-2 flex items-center gap-1">
                    <span className="text-xs text-gray-600">Reference:</span>
                    <Button
                      size="sm"
                      variant={refFrom === 'moon' ? 'default' : 'outline'}
                      onClick={() => setRefFrom('moon')}
                    >
                      Moon
                    </Button>
                    <Button
                      size="sm"
                      variant={refFrom === 'lagna' ? 'default' : 'outline'}
                      onClick={() => setRefFrom('lagna')}
                    >
                      Lagna
                    </Button>
                  </div>
                </div>
              </div>
              {transitsUpdatedAt && (
                <p className="text-xs text-gray-500 mb-2">Last updated: {new Date(transitsUpdatedAt).toLocaleString('en-IN')}</p>
              )}
              {transitError && (
                <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{transitError}</div>
              )}
              {Array.isArray(transitsState) && transitsState.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {transitsState.map((t: any) => (
                    <div key={t.planet} className="border rounded p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-semibold text-indigo-700">{t.planet}</p>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200">{t.current_sign}</span>
                      </div>
                      <p className="text-sm text-gray-700 mt-2">
                        From Moon: <span className={refFrom === 'moon' ? 'font-semibold text-indigo-700' : 'font-semibold'}>{t.from_natal_moon}</span>
                        {' '}•{' '}From Lagna: <span className={refFrom === 'lagna' ? 'font-semibold text-indigo-700' : 'font-semibold'}>{t.from_natal_lagna}</span>
                      </p>
                      {Array.isArray(t.aspects_natal) && t.aspects_natal.length > 0 && (
                        <p className="text-xs text-gray-600 mt-2">Aspects natal: {t.aspects_natal.join(', ')}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No transit data available. Create your kundli to see current Gochar.</p>
              )}
            </div>
          </TabsContent>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="animate-in fade-in-50 duration-200">
            <div className="space-y-6">
              <div className="flex items-center justify-end mb-2">
                <Button size="sm" variant="outline" onClick={refreshPredictions} disabled={isRefreshingPredictions}>{isRefreshingPredictions ? 'Refreshing…' : 'Refresh Predictions'}</Button>
              </div>
              {predictionsError && (
                <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{predictionsError}</div>
              )}
              {summaryState && (
                (() => {
                  const s: any = summaryState || {}
                  const tfLabelMap: Record<string, string> = {
                    now: 'Now',
                    next_90_days: 'Next 90 Days',
                    next_12_months: 'Next 12 Months',
                  }
                  const execEntries: Array<{ line: string; tf: string }> = [
                    ...((s.now?.executive || []).map((line: string) => ({ line, tf: 'now' }))),
                    ...((s.next_90_days?.executive || []).map((line: string) => ({ line, tf: 'next_90_days' }))),
                    ...((s.next_12_months?.executive || []).map((line: string) => ({ line, tf: 'next_12_months' }))),
                  ]
                  const themesAll: string[] = [
                    ...((s.now?.activated_themes) || []),
                    ...((s.next_90_days?.activated_themes) || []),
                    ...((s.next_12_months?.activated_themes) || []),
                  ]
                  const flagsAll: string[] = [
                    ...((s.now?.caution_flags) || []),
                    ...((s.next_90_days?.caution_flags) || []),
                    ...((s.next_12_months?.caution_flags) || []),
                  ]
                  const uniqueThemes = Array.from(new Set(themesAll))
                  const uniqueFlags = Array.from(new Set(flagsAll))
                  return (
                    <div className="bg-white/90 backdrop-blur rounded-lg shadow-md p-6 sticky top-16 z-20 border border-gray-200">
                      <h2 className="text-2xl font-semibold mb-3">Highlights</h2>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-semibold text-indigo-700">Executive Summary</p>
                          <ul className="text-sm text-gray-700 ml-4 list-disc">
                            {execEntries.map((item, i) => (
                              <li key={i} className="flex items-start justify-between">
                                <span>{item.line}</span>
                                <span className="ml-2 text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                                  {tfLabelMap[item.tf] || item.tf}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-indigo-700">Activated Themes</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {uniqueThemes.map((t, i) => (
                              <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-200">{t}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-red-700">Caution Flags</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {uniqueFlags.map((t, i) => (
                              <span key={i} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded border border-red-200">{t}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()
              )}
              {predictionsState && Object.keys(predictionsState).length > 0 ? (
                Object.entries(predictionsState).map(([timeframe, preds]: [string, any]) => (
                  <div key={timeframe} className="bg-white rounded-lg shadow-md p-0">
                    <div className="sticky top-28 z-10 bg-white/95 backdrop-blur border-b border-gray-200 px-6 py-4 rounded-t-lg">
                      <h2 className="text-2xl font-semibold capitalize">{timeframe.replace('_', ' ')}</h2>
                    </div>
                    <div className="px-6 pt-4">
                    {(() => {
                      const tfSummary = summaryState && (summaryState as any)[timeframe]
                      if (!tfSummary) return null
                      return (
                        <div className="mb-4 grid md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm font-semibold text-indigo-700">Executive Summary</p>
                            <ul className="text-sm text-gray-700 ml-4 list-disc">
                              {(tfSummary.executive || []).map((line: string, i: number) => (
                                <li key={i}>{line}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-indigo-700">Activated Themes</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {(tfSummary.activated_themes || []).map((t: string, i: number) => (
                                <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-200">{t}</span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-red-700">Caution Flags</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {(tfSummary.caution_flags || []).map((t: string, i: number) => (
                                <span key={i} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded border border-red-200">{t}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                    <div className="space-y-4 px-6 pb-6">
                      {preds.length === 0 && (
                        <div className="space-y-3">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                          ))}
                        </div>
                      )}
                      {preds.map((pred: any) => (
                        <div
                          key={pred.id}
                          className="border-l-4 border-indigo-500 pl-4 py-3 rounded bg-white/50 transition-colors hover:bg-white"
                        >
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-2 gap-2">
                            <h3 className="font-bold text-lg leading-snug">{pred.headline}</h3>
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200">
                                {pred.domain}
                              </span>
                              {typeof pred.confidence_score === 'number' && (
                                <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-200">
                                  {(pred.confidence_score * 100).toFixed(0)}% confidence
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-gray-700 mb-3">{pred.description}</p>
                          {Array.isArray(pred.what_this_means) && pred.what_this_means.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm font-semibold text-indigo-700">What this means</p>
                              <ul className="text-sm text-gray-700 ml-4 list-disc">
                                {pred.what_this_means.slice(0,3).map((s: string, i: number) => (
                                  <li key={i}>{s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {pred.do_suggestions.length > 0 && (
                            <div className="mb-2">
                              <p className="text-sm font-semibold text-green-700">Do:</p>
                              <ul className="text-sm text-gray-600 ml-4">
                                {pred.do_suggestions.map((s: string, i: number) => (
                                  <li key={i}>• {s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {pred.dont_suggestions.length > 0 && (
                            <div>
                              <p className="text-sm font-semibold text-red-700">Don't:</p>
                              <ul className="text-sm text-gray-600 ml-4">
                                {pred.dont_suggestions.map((s: string, i: number) => (
                                  <li key={i}>• {s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          <details className="mt-3">
                            <summary className="text-sm text-indigo-600 cursor-pointer">
                              Why am I seeing this?
                            </summary>
                            <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
                              {Array.isArray(pred.evidence) && pred.evidence[0]?.triggered_conditions?.length > 0 ? (
                                pred.evidence[0].triggered_conditions.map((cond: string, i: number) => (
                                  <p key={i}>• {cond}</p>
                                ))
                              ) : (
                                <p className="text-gray-500">Model did not provide detailed triggers.</p>
                              )}
                              {typeof pred.confidence_score === 'number' && (
                                <p className="mt-2 font-semibold">
                                  Confidence: {(pred.confidence_score * 100).toFixed(0)}%
                                </p>
                              )}
                            </div>
                          </details>
                        </div>
                      ))}
                    </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <p className="text-gray-600">Prediction data not available</p>
                </div>
              )}
              {/* Mangal Dosha Section */}
              {(() => {
                const md = detectMangalDosha(vedic.d1_chart)
                const desc = getMangalDoshaDescription()
                const remedies = getMangalDoshaRemedies()
                const status = md.presentLagna || md.presentMoon
                return (
                  <div className="mt-6 bg-orange-50 border border-orange-200 rounded p-4">
                    <h3 className="text-xl font-semibold mb-2">Mangal Dosha</h3>
                    <p className="text-sm font-semibold">
                      Status: {status ? 'Potentially present' : 'Not observed in Lagna or Moon chart'}
                    </p>
                    <p className="text-xs text-gray-600 mb-2">
                      Lagna chart: {md.presentLagna ? 'Mars in critical houses' : 'No critical placements'} • Moon chart: {md.presentMoon ? 'Mars in critical houses' : 'No critical placements'}
                    </p>
                    <ul className="text-sm text-gray-700 ml-4 list-disc">
                      {desc.map((d, i) => (<li key={i}>{d}</li>))}
                    </ul>
                    <div className="grid md:grid-cols-3 gap-3 mt-3">
                      <div>
                        <p className="text-sm font-semibold text-orange-700">Remedies (before marriage)</p>
                        <ul className="text-sm text-gray-700 ml-4 list-disc">
                          {remedies.preMarriage.map((r, i) => (<li key={i}>{r}</li>))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-orange-700">Remedies (after marriage)</p>
                        <ul className="text-sm text-gray-700 ml-4 list-disc">
                          {remedies.postMarriage.map((r, i) => (<li key={i}>{r}</li>))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-orange-700">Remedies (Lal Kitab style)</p>
                        <ul className="text-sm text-gray-700 ml-4 list-disc">
                          {remedies.lalKitabStyle.map((r, i) => (<li key={i}>{r}</li>))}
                        </ul>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">{remedies.disclaimer}</p>
                  </div>
                )
              })()}
            </div>
          </TabsContent>
        </Tabs>
      </main>
      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-[100] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${t.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'} border rounded shadow px-3 py-2 text-sm`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  )
}
