import { JSX } from 'react'
import { Icons } from '@/Components/Icons'

const GOAL_ICON_MAP: Record<string, (p: { size?: number; strokeWidth?: number }) => JSX.Element> = {
  shield: Icons.Shield, home: Icons.Home, plane: Icons.Plane, car: Icons.Car,
  graduation: Icons.GraduationCap, heart: Icons.Heart, briefcase: Icons.Briefcase,
  smartphone: Icons.Smartphone, leaf: Icons.Leaf, coin: Icons.Coin,
  wrench: Icons.Wrench, gamepad: Icons.GamePad, star: Icons.Star,
  flag: Icons.Flag, trend: Icons.Trend, finance: Icons.Finance,
}

interface Props {
  iconKey: string
  /** Color (CSS color value or var). Used for icon stroke + derived background. */
  color?: string
  size?: number
}

export default function GoalIcon({ iconKey, color = 'var(--green)', size = 36 }: Props) {
  const Icon = GOAL_ICON_MAP[iconKey] ?? Icons.Shield
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        background: `color-mix(in oklab, ${color} 16%, var(--surface-2))`,
        border: `1px solid color-mix(in oklab, ${color} 32%, transparent)`,
        color,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={Math.round(size * 0.46)} strokeWidth={1.5} />
    </div>
  )
}

export { GOAL_ICON_MAP }
