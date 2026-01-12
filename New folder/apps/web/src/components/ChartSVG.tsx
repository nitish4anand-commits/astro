type D1Chart = Record<string, string[]>

export default function ChartSVG({ d1 }: { d1: D1Chart }) {
  const houses = Array.from({ length: 12 }, (_, i) => String(i + 1))
  const size = 300
  const center = size / 2
  const radius = size / 2 - 10

  // Simple circular chart divided into 12 sectors with house labels
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="D1 Chart Preview">
      <circle cx={center} cy={center} r={radius} fill="#eef2ff" stroke="#c7d2fe" strokeWidth={2} />
      {houses.map((h, idx) => {
        const startAngle = ((idx) * 30 - 90) * (Math.PI / 180)
        const endAngle = ((idx + 1) * 30 - 90) * (Math.PI / 180)
        const x1 = center + radius * Math.cos(startAngle)
        const y1 = center + radius * Math.sin(startAngle)
        const x2 = center + radius * Math.cos(endAngle)
        const y2 = center + radius * Math.sin(endAngle)
        const midAngle = ((idx + 0.5) * 30 - 90) * (Math.PI / 180)
        const mx = center + (radius - 30) * Math.cos(midAngle)
        const my = center + (radius - 30) * Math.sin(midAngle)
        const planets = (d1[h] || []).join(', ')
        return (
          <g key={h}>
            <line x1={center} y1={center} x2={x1} y2={y1} stroke="#c7d2fe" strokeWidth={1} />
            <text x={mx} y={my} fill="#4f46e5" fontSize={10} textAnchor="middle" dominantBaseline="middle">
              H{h}
            </text>
            {/* Planet labels toward edge */}
            {planets && (
              <text x={mx} y={my + 12} fill="#111827" fontSize={9} textAnchor="middle" dominantBaseline="middle">
                {planets}
              </text>
            )}
            <line x1={center} y1={center} x2={x2} y2={y2} stroke="#c7d2fe" strokeWidth={1} />
          </g>
        )
      })}
      <circle cx={center} cy={center} r={18} fill="#6366f1" />
      <text x={center} y={center} fill="#fff" fontSize={10} textAnchor="middle" dominantBaseline="middle">
        D1
      </text>
    </svg>
  )
}
