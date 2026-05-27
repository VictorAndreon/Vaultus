interface Props {
  name: string
  /** Override the period (for testing/showcase). Default: derived from current hour. */
  period?: 'morning' | 'afternoon' | 'evening'
}

function periodFromHour(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

const LABEL: Record<'morning' | 'afternoon' | 'evening', string> = {
  morning: 'Bom dia',
  afternoon: 'Boa tarde',
  evening: 'Boa noite',
}

export default function Greeting({ name, period }: Props) {
  const actual = period ?? periodFromHour(new Date().getHours())
  return (
    <h1 className="page-title">
      {LABEL[actual]}, <em>{name}</em>.
    </h1>
  )
}
