interface Props {
  data: number[]
  color?: string
  w?: number
  h?: number
}

export default function Sparkline({ data, color = 'var(--green)', w = 140, h = 28 }: Props) {
  if (data.length < 2) return null
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1) * w).toFixed(1)},${(h - ((v - min) / range) * (h - 2) - 1).toFixed(1)}`).join(' ')
  return <svg width={w} height={h}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
