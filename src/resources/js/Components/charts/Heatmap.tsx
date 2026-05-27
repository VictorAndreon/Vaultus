interface Row {
  label: string
  values: (number | null)[]
}

interface Props {
  rows: Row[]
  cell?: number
  gap?: number
  labelWidth?: number
}

function shade(value: number | null): string {
  if (value === null) return 'var(--surface-3)'
  if (value <= 0) return 'var(--surface-3)'
  if (value < 0.25) return 'oklch(28% 0.05 var(--h))'
  if (value < 0.5) return 'oklch(38% 0.09 var(--h))'
  if (value < 0.75) return 'oklch(56% 0.12 var(--h))'
  return 'var(--green-bright)'
}

export default function Heatmap({ rows, cell = 14, gap = 4, labelWidth = 60 }: Props) {
  if (rows.length === 0) return null
  const cols = Math.max(...rows.map((r) => r.values.length))

  return (
    <div style={{ display: 'inline-block' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `${labelWidth}px repeat(${cols}, ${cell}px)`,
          gap: `${gap}px`,
          alignItems: 'center',
        }}
      >
        {rows.map((row) => (
          <RowCells key={row.label} row={row} cell={cell} />
        ))}
      </div>
    </div>
  )
}

function RowCells({ row, cell }: { row: Row; cell: number }) {
  return (
    <>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--text-3)',
          textAlign: 'right',
          paddingRight: 8,
        }}
      >
        {row.label}
      </div>
      {row.values.map((value, i) => (
        <div
          key={i}
          style={{
            width: cell,
            height: cell,
            borderRadius: 3,
            background: shade(value),
          }}
        />
      ))}
    </>
  )
}
