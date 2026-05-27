interface Props {
  initials: string
  size?: number
  /** Optional hue shift via CSS var --h override, useful for differentiating categories */
  hue?: number
}

export default function GradientAvatar({ initials, size = 30, hue }: Props) {
  const fontSize = Math.max(10, Math.round(size * 0.36))
  const style: React.CSSProperties = {
    width: size,
    height: size,
    fontSize,
  }
  if (hue !== undefined) {
    (style as Record<string, string | number>)['--h'] = String(hue)
  }
  return (
    <div className="avatar" style={style}>
      {initials.slice(0, 2).toUpperCase()}
    </div>
  )
}
