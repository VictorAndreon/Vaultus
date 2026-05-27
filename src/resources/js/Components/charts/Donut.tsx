interface Slice {
  label: string
  value: number
  color: string
}

interface Props {
  data: Slice[]
  size?: number
  thickness?: number
  center?: React.ReactNode
}

function polar(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.cos(angle - Math.PI / 2),
    y: cy + r * Math.sin(angle - Math.PI / 2),
  }
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  const startPoint = polar(cx, cy, r, end)
  const endPoint = polar(cx, cy, r, start)
  const largeArc = end - start > Math.PI ? 1 : 0
  return `M${startPoint.x},${startPoint.y} A${r},${r} 0 ${largeArc} 0 ${endPoint.x},${endPoint.y}`
}

export default function Donut({ data, size = 160, thickness = 14, center }: Props) {
  const total = data.reduce((sum, s) => sum + s.value, 0)
  if (total <= 0) return null

  const cx = size / 2
  const cy = size / 2
  const r = (size - thickness) / 2

  let acc = 0
  const arcs = data.map((slice) => {
    const start = (acc / total) * Math.PI * 2
    acc += slice.value
    const end = (acc / total) * Math.PI * 2
    return { ...slice, start, end }
  })

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {arcs.map((arc, i) => (
          <path
            key={i}
            d={arcPath(cx, cy, r, arc.start, arc.end)}
            fill="none"
            stroke={arc.color}
            strokeWidth={thickness}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      {center !== undefined && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            textAlign: 'center',
          }}
        >
          {center}
        </div>
      )}
    </div>
  )
}
