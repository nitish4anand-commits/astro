type D9Chart = Record<string, string[]>

export default function ChartSVGNavamsa({ d9 }: { d9: D9Chart }) {
  const houses = Array.from({ length: 12 }, (_, i) => String(i + 1))
  const size = 300
  const center = size / 2
  const radius = size / 2 - 10

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="D9 Chart Preview">
      <circle cx={center} cy={center} r={radius} fill="#fff7ed" stroke="#fed7aa" strokeWidth={2} />
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
        const planets = (d9[h] || []).join(', ')
        return (
          <g key={h}>
            <line x1={center} y1={center} x2={x1} y2={y1} stroke="#fed7aa" strokeWidth={1} />
            <text x={mx} y={my} fill="#c2410c" fontSize={10} textAnchor="middle" dominantBaseline="middle">
              H{h}
            </text>
            {planets && (
              <text x={mx} y={my + 12} fill="#111827" fontSize={9} textAnchor="middle" dominantBaseline="middle">
                {planets}
              </text>
            )}
            <line x1={center} y1={center} x2={x2} y2={y2} stroke="#fed7aa" strokeWidth={1} />
          </g>
        )
      })}
      <circle cx={center} cy={center} r={18} fill="#fb923c" />
      <text x={center} y={center} fill="#fff" fontSize={10} textAnchor="middle" dominantBaseline="middle">
        D9
      </text>
    </svg>
  )
}
