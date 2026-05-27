interface Point {
  label: string
  value: number
}

interface Props {
  data: Point[]
  height?: number
  accent?: string
  showEndDot?: boolean
}

const PAD_X = 8
const PAD_TOP = 12
const PAD_BOTTOM = 28

export default function AreaChart({
  data,
  height = 200,
  accent = 'var(--green)',
  showEndDot = true,
}: Props) {
  if (data.length < 2) return null

  return (
    <svg
      viewBox={`0 0 1000 ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      aria-hidden="true"
    >
      <ChartBody data={data} height={height} accent={accent} showEndDot={showEndDot} />
    </svg>
  )
}

function ChartBody({ data, height, accent, showEndDot }: Required<Props>) {
  const innerHeight = height - PAD_TOP - PAD_BOTTOM
  const width = 1000 - PAD_X * 2

  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const stepX = width / (data.length - 1)

  const points = data.map((point, index) => {
    const x = PAD_X + index * stepX
    const y = PAD_TOP + (1 - (point.value - min) / range) * innerHeight
    return { x, y, label: point.label }
  })

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ')
  const last = points[points.length - 1]
  const first = points[0]
  const areaPath = `${linePath} L${last.x.toFixed(2)},${height - PAD_BOTTOM} L${first.x.toFixed(2)},${height - PAD_BOTTOM} Z`

  return (
    <>
      <path d={areaPath} fill={accent} opacity={0.14} />
      <path
        d={linePath}
        fill="none"
        stroke={accent}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {showEndDot && (
        <circle cx={last.x} cy={last.y} r="3.5" fill="var(--bg)" stroke={accent} strokeWidth={1.5} />
      )}
      {points.map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={height - 10}
          fontSize="10"
          fontFamily="var(--mono)"
          fill="var(--text-3)"
          textAnchor="middle"
        >
          {p.label}
        </text>
      ))}
    </>
  )
}
