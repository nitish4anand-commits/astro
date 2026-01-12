"use client"

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getMahadashaImplications, getAntardashaModifiers, getMahadashaDetails, getCombinationNote, getAntardashaDetails } from '@/lib/dasha'
import { detectMangalDosha, getMangalDoshaDescription, getMangalDoshaRemedies } from '@/lib/doshas'

export default function KundliPrintPage() {
  const [chartData, setChartData] = useState<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('currentChart')
    if (stored) setChartData(JSON.parse(stored))
    // Trigger print shortly after render for convenience
    const t = setTimeout(() => {
      try {
        window.print()
      } catch {
        // ignore
      }
    }, 600)
    return () => clearTimeout(t)
  }, [])

  if (!chartData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No chart data to print</p>
          <Link href="/create">
            <Button>Create a Kundli</Button>
          </Link>
        </div>
      </div>
    )
  }

  const { input_echo, vedic, dashas, predictions, western, dasha_insights, transits, transits_last_updated } = chartData

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-3xl mx-auto p-6 print:p-0">
        {/* Header (hidden on print) */}
        <div className="flex justify-between items-center mb-4 no-print">
          <h1 className="text-2xl font-bold">Astro Kundli — Report</h1>
          <div className="space-x-2">
            <Button onClick={() => window.print()}>Print</Button>
            <Button onClick={async () => {
              try {
                const element = containerRef.current
                if (!element) return
                // @ts-ignore
                const html2canvas = (await import('html2canvas')).default
                // @ts-ignore
                const { jsPDF } = await import('jspdf')
                const canvas = await html2canvas(element, { scale: 2 })
                const imgData = canvas.toDataURL('image/png')
                const pdf = new jsPDF('p', 'mm', 'a4')
                const pageWidth = pdf.internal.pageSize.getWidth()
                const pageHeight = pdf.internal.pageSize.getHeight()
                const imgWidth = pageWidth
                const imgHeight = (canvas.height * imgWidth) / canvas.width
                let heightLeft = imgHeight
                let position = 0
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
                heightLeft -= pageHeight
                while (heightLeft > 0) {
                  pdf.addPage()
                  position = heightLeft * -1
                  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
                  heightLeft -= pageHeight
                }
                pdf.save(`astro-kundli-${(chartData?.input_echo?.name || 'report').replace(/\s+/g, '_')}.pdf`)
              } catch (e) {
                try { console.error('PDF export failed', e) } catch { /* noop */ }
              }
            }}>Download PDF</Button>
            <Link href="/kundli"><Button variant="ghost">Back</Button></Link>
          </div>
        </div>

        {/* Cover */}
        <div ref={containerRef} className="border-2 border-black p-6 mb-6">
          <div className="flex items-center mb-2">
            <svg aria-hidden className="mr-2" width="28" height="28" viewBox="0 0 24 24" fill="black">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
            <h2 className="text-3xl font-extrabold">Astro Kundli</h2>
          </div>
          <p className="text-sm text-gray-700 mb-4">Comprehensive Vedic & Western Astrology Report</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold">Name</p>
              <p className="text-lg">{input_echo.name}</p>
            </div>
            <div>
              <p className="text-sm font-semibold">Generated</p>
              <p className="text-lg">{new Date().toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-sm font-semibold">Birth Date & Time</p>
              <p className="text-lg">{new Date(input_echo.local_datetime).toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-sm font-semibold">Place</p>
              <p className="text-lg">{input_echo.place}</p>
            </div>
          </div>
        </div>
        <div className="page-break" />

        {/* Title */}
        <h2 className="text-xl font-semibold mb-2">Birth Details</h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-600 font-semibold">Name</p>
            <p className="text-base">{input_echo.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 font-semibold">Date & Time</p>
            <p className="text-base">{new Date(input_echo.local_datetime).toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 font-semibold">Place</p>
            <p className="text-base">{input_echo.place}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 font-semibold">Timezone</p>
            <p className="text-base">{input_echo.timezone || 'Auto-detected'}</p>
          </div>
        </div>

        {/* Key Vedic Info */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Vedic Summary</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 font-semibold">Lagna</p>
              <p className="text-base">{vedic.lagna_rashi}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-semibold">Lagna Lord</p>
              <p className="text-base">{vedic.lagna_lord}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-semibold">Ayanamsa</p>
              <p className="text-base">Lahiri ({(vedic.ayanamsa || 0).toFixed?.(2) || vedic.ayanamsa})°</p>
            </div>
          </div>
        </div>
        <div className="page-break" />

        {/* Planetary Positions */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Planetary Positions (Sidereal)</h2>
          {Array.isArray(vedic.planets) && vedic.planets.length > 0 ? (
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1 text-left">Planet</th>
                  <th className="border px-2 py-1 text-left">Rashi</th>
                  <th className="border px-2 py-1 text-left">Degree</th>
                  <th className="border px-2 py-1 text-left">Nakshatra</th>
                  <th className="border px-2 py-1 text-left">Retrograde</th>
                </tr>
              </thead>
              <tbody>
                {vedic.planets.map((p: any) => (
                  <tr key={p.name}>
                    <td className="border px-2 py-1">{p.name}</td>
                    <td className="border px-2 py-1">{p.rashi}</td>
                    <td className="border px-2 py-1">{p.degree}° {p.minute}'</td>
                    <td className="border px-2 py-1">{p.nakshatra} (Pada {p.pada})</td>
                    <td className="border px-2 py-1">{p.retrograde ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-700">Planetary data not available</p>
          )}
        </div>
        <div className="page-break" />

        {/* Western Summary */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Western Summary</h2>
          {western ? (
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-sm text-gray-600 font-semibold">House System</p>
                <p className="text-base">{western.house_system || '—'}</p>
              </div>
            </div>
          ) : null}
        </div>
        {/* Western Overview */}
        {western && western.ascendant && western.mc && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Western Overview</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="border p-3">
                <p className="text-sm text-gray-600 font-semibold">Ascendant</p>
                <p className="text-base">
                  {western.ascendant.sign} — {Number(western.ascendant.degree).toFixed(0)}° {western.ascendant.minute}'
                </p>
              </div>
              <div className="border p-3">
                <p className="text-sm text-gray-600 font-semibold">MC (Midheaven)</p>
                <p className="text-base">
                  {western.mc.sign} — {Number(western.mc.degree).toFixed(0)}° {western.mc.minute}'
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Western Aspects Summary</h2>
          {western && Array.isArray(western.aspects) && western.aspects.length > 0 ? (
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1 text-left">Aspect</th>
                  <th className="border px-2 py-1 text-left">Angle</th>
                  <th className="border px-2 py-1 text-left">Orb</th>
                  <th className="border px-2 py-1 text-left">Applying</th>
                </tr>
              </thead>
              <tbody>
                {western.aspects.map((a: any, idx: number) => (
                  <tr key={(a.planet1 || '') + (a.planet2 || '') + idx}>
                    <td className="border px-2 py-1">{a.planet1} – {a.planet2} ({a.aspect_type})</td>
                    <td className="border px-2 py-1">{Number(a.angle).toFixed(1)}°</td>
                    <td className="border px-2 py-1">{Number(a.orb).toFixed(1)}°</td>
                    <td className="border px-2 py-1">{a.applying ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-700">Aspects data not available</p>
          )}
        </div>
        {/* Western Dignities */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Western Dignities</h2>
          {western && western.dignities && Object.keys(western.dignities).length > 0 ? (
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1 text-left">Planet</th>
                  <th className="border px-2 py-1 text-left">Dignity</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(western.dignities).map(([planet, dignity]: [string, any]) => (
                  <tr key={planet}>
                    <td className="border px-2 py-1">{planet}</td>
                    <td className="border px-2 py-1">{String(dignity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-700">Dignities data not available</p>
          )}
        </div>

        {/* Current Transits (Gochar) */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Current Transits (Gochar)</h2>
          {transits_last_updated && (
            <p className="text-xs text-gray-600 mb-2">Snapshot: {new Date(transits_last_updated).toLocaleString('en-IN')}</p>
          )}
          {Array.isArray(transits) && transits.length > 0 ? (
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1 text-left">Planet</th>
                  <th className="border px-2 py-1 text-left">Sign</th>
                  <th className="border px-2 py-1 text-left">From Moon</th>
                  <th className="border px-2 py-1 text-left">From Lagna</th>
                  <th className="border px-2 py-1 text-left">Aspects Natal</th>
                </tr>
              </thead>
              <tbody>
                {transits.map((t: any) => (
                  <tr key={t.planet}>
                    <td className="border px-2 py-1">{t.planet}</td>
                    <td className="border px-2 py-1">{t.current_sign}</td>
                    <td className="border px-2 py-1">{t.from_natal_moon}</td>
                    <td className="border px-2 py-1">{t.from_natal_lagna}</td>
                    <td className="border px-2 py-1">{Array.isArray(t.aspects_natal) && t.aspects_natal.length ? t.aspects_natal.join(', ') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-700">Transit data not available</p>
          )}
        </div>
        <div className="page-break" />

        {/* Dashas */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Vimshottari Dasha</h2>
          {dashas && dashas.length > 0 ? (
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1 text-left">Period</th>
                  <th className="border px-2 py-1 text-left">Start</th>
                  <th className="border px-2 py-1 text-left">End</th>
                  <th className="border px-2 py-1 text-left">Years</th>
                  <th className="border px-2 py-1 text-left">Current</th>
                </tr>
              </thead>
              <tbody>
                {dashas.slice(0, 12).map((d: any) => (
                  <tr key={d.planet + d.start_date}>
                    <td className="border px-2 py-1">{d.planet} ({d.level})</td>
                    <td className="border px-2 py-1">{new Date(d.start_date).toLocaleDateString('en-IN')}</td>
                    <td className="border px-2 py-1">{new Date(d.end_date).toLocaleDateString('en-IN')}</td>
                    <td className="border px-2 py-1">{Number(d.duration_years).toFixed(2)}</td>
                    <td className="border px-2 py-1">{d.current ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-700">Dasha data not available</p>
          )}
        </div>
        {/* Current Dasha Themes */}
        {dashas && dashas.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Current Dasha Themes</h2>
            {(() => {
              const currentMaha = (dashas as any[]).find((d) => d.level === 'Maha' && d.current)
              const currentAntar = (dashas as any[]).find((d) => d.level === 'Antar' && d.current)
              const mahaImp = currentMaha ? getMahadashaImplications(String(currentMaha.planet)) : []
              const antarLord = currentAntar ? String(currentAntar.planet).split('/')[1] : undefined
              const antarImp = antarLord ? getAntardashaModifiers(antarLord) : []
              return (
                <div className="grid grid-cols-2 gap-4">
                  <div className="border p-3">
                    <p className="text-sm font-semibold">Mahadasha ({currentMaha?.planet || '—'})</p>
                    {mahaImp.length ? (
                      <ul className="text-sm text-gray-800 ml-4 list-disc">
                        {mahaImp.map((m, i) => (<li key={i}>{m}</li>))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-600">No themes available</p>
                    )}
                      {currentMaha && (() => {
                        const d = getMahadashaDetails(String(currentMaha.planet))
                        if (!d) return null
                        return (
                          <div className="mt-2">
                            <p className="text-xs text-gray-700">{d.overview}</p>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              <div>
                                <p className="text-xs font-semibold text-green-700">Strengths</p>
                                <ul className="text-xs text-gray-700 ml-4 list-disc">
                                  {d.strengths.slice(0,2).map((s, i) => (<li key={i}>{s}</li>))}
                                </ul>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-red-700">Challenges</p>
                                <ul className="text-xs text-gray-700 ml-4 list-disc">
                                  {d.challenges.slice(0,2).map((c, i) => (<li key={i}>{c}</li>))}
                                </ul>
                              </div>
                            <div className="col-span-2">
                              <p className="text-xs font-semibold text-indigo-700">Remedies</p>
                              <ul className="text-xs text-gray-700 ml-4 list-disc">
                                {d.remedies.slice(0,3).map((r, i) => (<li key={i}>{r}</li>))}
                              </ul>
                            </div>
                            </div>
                          </div>
                        )
                      })()}
                  </div>
                  <div className="border p-3">
                    <p className="text-sm font-semibold">Antardasha ({antarLord || '—'})</p>
                    {antarImp.length ? (
                      <ul className="text-sm text-gray-800 ml-4 list-disc">
                        {antarImp.map((m, i) => (<li key={i}>{m}</li>))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-600">No modifiers active</p>
                    )}
                      {currentMaha && antarLord && (() => {
                        const note = getCombinationNote(String(currentMaha.planet), antarLord)
                        return note ? <p className="text-xs text-gray-600 mt-2">Note: {note}</p> : null
                      })()}
                      {antarLord && (() => {
                        const ad = getAntardashaDetails(antarLord)
                        if (!ad) return null
                        return (
                          <div className="mt-2">
                            <p className="text-xs text-gray-700">{ad.overview}</p>
                            <div className="grid grid-cols-3 gap-2 mt-1">
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
                </div>
              )
            })()}
          </div>
        )}
        {/* Personalized Dasha Insights */}
        {dasha_insights && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Personalized Dasha Insights</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="border p-3">
                <p className="text-sm font-semibold">Mahadasha ({dasha_insights.mahadasha?.planet || '—'})</p>
                <ul className="text-sm text-gray-800 ml-4 list-disc">
                  {(dasha_insights.mahadasha?.themes || []).map((m: string, i: number) => (<li key={i}>{m}</li>))}
                </ul>
                {dasha_insights.mahadasha?.nakshatra && (
                  <p className="text-xs text-gray-600 mt-2">Nakshatra: {dasha_insights.mahadasha.nakshatra}</p>
                )}
              </div>
              <div className="border p-3">
                <p className="text-sm font-semibold">Antardasha ({dasha_insights.antardasha?.planet || '—'})</p>
                <ul className="text-sm text-gray-800 ml-4 list-disc">
                  {(dasha_insights.antardasha?.themes || []).map((m: string, i: number) => (<li key={i}>{m}</li>))}
                </ul>
                {dasha_insights.antardasha?.nakshatra && (
                  <p className="text-xs text-gray-600 mt-2">Nakshatra: {dasha_insights.antardasha.nakshatra}</p>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Mangal Dosha */}
        {(() => {
          const md = detectMangalDosha(vedic.d1_chart)
          const desc = getMangalDoshaDescription()
          const remedies = getMangalDoshaRemedies()
          const status = md.presentLagna || md.presentMoon
          return (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Mangal Dosha</h2>
              <p className="text-sm font-semibold">
                Status: {status ? 'Potentially present' : 'Not observed in Lagna or Moon chart'}
              </p>
              <p className="text-xs text-gray-600 mb-2">
                Lagna: {md.presentLagna ? 'Mars in critical houses' : 'No critical placements'} • Moon: {md.presentMoon ? 'Mars in critical houses' : 'No critical placements'}
              </p>
              <ul className="text-sm text-gray-800 ml-4 list-disc">
                {desc.map((d, i) => (<li key={i}>{d}</li>))}
              </ul>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div className="border p-3">
                  <p className="text-sm font-semibold">Remedies (before marriage)</p>
                  <ul className="text-xs text-gray-800 ml-4 list-disc">
                    {remedies.preMarriage.map((r, i) => (<li key={i}>{r}</li>))}
                  </ul>
                </div>
                <div className="border p-3">
                  <p className="text-sm font-semibold">Remedies (after marriage)</p>
                  <ul className="text-xs text-gray-800 ml-4 list-disc">
                    {remedies.postMarriage.map((r, i) => (<li key={i}>{r}</li>))}
                  </ul>
                </div>
                <div className="border p-3">
                  <p className="text-sm font-semibold">Remedies (Lal Kitab style)</p>
                  <ul className="text-xs text-gray-800 ml-4 list-disc">
                    {remedies.lalKitabStyle.map((r, i) => (<li key={i}>{r}</li>))}
                  </ul>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2">{remedies.disclaimer}</p>
            </div>
          )
        })()}
        <div className="page-break" />

        {/* Predictions */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Predictions</h2>
          {predictions && Object.keys(predictions).length > 0 ? (
            Object.entries(predictions).map(([timeframe, preds]: [string, any]) => (
              <div key={timeframe} className="mb-4">
                <h3 className="font-semibold capitalize mb-2">{timeframe.replace('_', ' ')}</h3>
                <div className="space-y-2">
                  {preds.map((pred: any) => (
                    <div key={pred.id} className="border-l-4 border-black pl-3">
                      <div className="flex justify-between">
                        <p className="font-semibold">{pred.headline}</p>
                        <span className="text-xs">{pred.domain}</span>
                      </div>
                      <p className="text-sm">{pred.description}</p>
                      {pred.do_suggestions?.length > 0 && (
                        <p className="text-sm mt-1"><span className="font-semibold">Do:</span> {pred.do_suggestions.join(', ')}</p>
                      )}
                      {pred.dont_suggestions?.length > 0 && (
                        <p className="text-sm"><span className="font-semibold">Don't:</span> {pred.dont_suggestions.join(', ')}</p>
                      )}
                      {pred.evidence?.[0]?.triggered_conditions && (
                        <p className="text-xs mt-1">Why: {pred.evidence[0].triggered_conditions.join('; ')}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-700">Prediction data not available</p>
          )}
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-600 mt-8">
          <p>Generated on {new Date().toLocaleString('en-IN')}</p>
          <p>For educational and entertainment purposes only.</p>
        </div>

        {/* Watermark (print only) */}
        <div className="watermark">Astro Kundli</div>

        {/* Appendix */}
        <div className="page-break" />
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Appendix: How Predictions Work</h2>
          <p className="text-sm text-gray-800 mb-2">
            Predictions are generated via a lightweight rule DSL that combines natal promises (e.g., strong
            10th lord), active dasha periods (Maha/Antar), and current transits (Gochar). Each rule carries
            a base weight and earns confidence bonuses when multiple conditions trigger.
          </p>
          <ul className="list-disc ml-6 text-sm text-gray-800 space-y-1">
            <li>
              Timeframes: <span className="font-semibold">Now</span>, <span className="font-semibold">Next 90 days</span>,
              <span className="font-semibold"> Next 12 months</span>
            </li>
            <li>
              Confidence: Derived from rule weight + condition bonuses; top results are prioritized.
            </li>
            <li>
              Explainability: Each prediction includes a “Why” section with triggered conditions.
            </li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        @media print {
          .no-print { display: none; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-break { page-break-after: always; }
          @page { margin: 16mm; }
          .watermark {
            display: block;
            position: fixed;
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-15deg);
            font-size: 64px;
            color: rgba(0,0,0,0.08);
            font-weight: 800;
            z-index: 0;
            pointer-events: none;
          }
        }
        .page-break { display: block; height: 1px; }
        .watermark { display: none; }
      `}</style>
    </div>
  )
}
