interface Props {
  data: number[]
  width?: number
  height?: number
  accent?: string
  area?: boolean
  strokeWidth?: number
}

export default function Sparkline({
  data,
  width = 80,
  height = 24,
  accent = 'var(--green)',
  area = false,
  strokeWidth = 1.5,
}: Props) {
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const stepX = width / (data.length - 1)

  const points = data.map((value, index) => {
    const x = index * stepX
    const y = height - ((value - min) / range) * height
    return [x, y] as const
  })

  const linePath = points
    .map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`))
    .join(' ')

  const areaPath = `${linePath} L${width},${height} L0,${height} Z`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {area && <path d={areaPath} fill={accent} opacity={0.18} />}
      <path
        d={linePath}
        fill="none"
        stroke={accent}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
