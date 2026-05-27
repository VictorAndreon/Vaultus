import { Icons } from '@/Components/Icons'

type Variant = 'shield' | 'home' | 'plane' | 'car'

interface Props {
  variant: Variant
  size?: number
}

const CONFIG: Record<Variant, { icon: keyof typeof Icons; bg: string; fg: string }> = {
  shield: { icon: 'Shield', bg: 'var(--green-soft)', fg: 'var(--green-bright)' },
  home:   { icon: 'Home',   bg: 'oklch(28% 0.04 85)',  fg: 'var(--gold)' },
  plane:  { icon: 'Plane',  bg: 'oklch(28% 0.03 230)', fg: 'var(--sky)' },
  car:    { icon: 'Car',    bg: 'oklch(28% 0.05 320)', fg: 'oklch(76% 0.12 320)' },
}

export default function GoalIcon({ variant, size = 36 }: Props) {
  const cfg = CONFIG[variant]
  const Icon = Icons[cfg.icon]
  const iconSize = Math.round(size * 0.5)
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--r-3)',
        background: cfg.bg,
        color: cfg.fg,
        display: 'grid',
        placeItems: 'center',
        flex: 'none',
      }}
    >
      <Icon size={iconSize} />
    </div>
  )
}
