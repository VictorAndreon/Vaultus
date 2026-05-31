# Fase 2 — Auditoria + integração nas telas existentes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir charts/ícones duplicados pelas primitivas editoriais canônicas (Fase 1) em todas as telas existentes, mantendo features superiores que os componentes legados possuíam.

**Architecture:** Duas fases sequenciais. Primeiro a **consolidação** — os componentes da Fase 1 ganham as features que existem nos componentes antigos do Finance/Dashboard/Hábitos (gradient, gridlines, dual-series, tooltip, 16 variantes de GoalIcon). Depois a **migração** tela por tela, deletando os componentes antigos ao final da etapa de cada tela.

**Tech Stack:** TypeScript estrito, React 19, Inertia, SVG puro, tokens OKLCH em `app.css`. Sem novas dependências.

---

## Contexto encontrado

Inspecionando o código existente, há **4 sistemas paralelos** que duplicam o vocabulário da Fase 1:

| Local | Componente | Problema |
|---|---|---|
| `Pages/Finance/components/charts/Sparkline.tsx` | Sparkline antigo | API `w`/`h` vs nova `width`/`height`; sem `area` |
| `Pages/Finance/components/charts/FlowAreaChart.tsx` | AreaChart com dual-series | Tem tooltip hover + gridlines + 2 séries. Novo AreaChart só single-series |
| `Pages/Finance/components/charts/DonutChart.tsx` | Donut com legenda integrada | Layout diferente, API `segments`/`center: {label,value}` |
| `Pages/Finance/components/goals/GoalIconBadge.tsx` | GoalIcon com 16 variantes + `color-mix` | Novo GoalIcon só 4 variantes hard-coded |
| `Pages/Dashboard/Index.tsx` (inline) | Sparkline + AreaChart + HabitGrid + GoalIcon | Tudo inline na página (functional duplicates) |
| `Pages/Habits/Index.tsx` (inline) | AreaChart com gradient/gridlines | Inline |
| `Pages/Journal/Index.tsx` (inline) | MoodChart (line simples) | Inline |

A consolidação resolve isso unificando tudo nos componentes canônicos de `@/Components/charts/*` e `@/Components/*`.

---

## File Structure

**Componentes canônicos (modificados):**
- `src/resources/js/Components/GoalIcon.tsx` — API ampliada: `iconKey: string` (16+ variantes) + `color: string`
- `src/resources/js/Components/charts/AreaChart.tsx` — props opcionais: `gradient`, `gridlines`, `dual` (séries duplas), `showTooltip`

**Componentes deletados ao final:**
- `src/resources/js/Pages/Finance/components/charts/Sparkline.tsx`
- `src/resources/js/Pages/Finance/components/charts/FlowAreaChart.tsx`
- `src/resources/js/Pages/Finance/components/charts/DonutChart.tsx`
- `src/resources/js/Pages/Finance/components/goals/GoalIconBadge.tsx`

**Telas modificadas:**
- `src/resources/js/Pages/Finance/Index.tsx`
- `src/resources/js/Pages/Finance/components/goals/GoalCard.tsx`
- `src/resources/js/Pages/Finance/components/goals/GoalModal.tsx` (importa `GOAL_ICON_MAP` antigo)
- `src/resources/js/Pages/Dashboard/Index.tsx`
- `src/resources/js/Pages/Habits/Index.tsx`
- `src/resources/js/Pages/Journal/Index.tsx`
- `src/resources/js/Pages/Tasks/Index.tsx`
- `src/resources/js/Pages/Projects/Index.tsx`
- `src/resources/js/Pages/Library/Index.tsx`
- `src/resources/js/Pages/Dev/Design.tsx` (atualizar showcase de GoalIcon após a nova API)

**Critério de "pronto" por tela:** visual no `https://vaultus.local/<rota>` mantém ou melhora a estética atual, sem regressão funcional. Testes manuais em dark+light.

---

## Task 1: Expandir `<GoalIcon />` para 16 variantes + API `iconKey`/`color`

**Files:**
- Modify: `src/resources/js/Components/GoalIcon.tsx`
- Modify: `src/resources/js/Pages/Dev/Design.tsx` (atualizar showcase para nova API)

**Motivação:** O `GoalIconBadge` antigo aceita 16 chaves (shield/home/plane/car/graduation/heart/briefcase/smartphone/leaf/coin/wrench/gamepad/star/flag/trend/finance) + `color` arbitrária com `color-mix` para bg. A versão da Fase 1 está limitada a 4 variantes hard-coded. Unificar.

- [ ] **Step 1: Substituir o conteúdo de `GoalIcon.tsx`**

Conteúdo novo de `src/resources/js/Components/GoalIcon.tsx`:

```tsx
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
```

- [ ] **Step 2: Atualizar o showcase em `Pages/Dev/Design.tsx`**

Substituir a seção `<section id="goal-icon">` (linhas ~54-63) por:

```tsx
<section id="goal-icon">
    <h2 className="h-2" style={{ marginBottom: 16 }}>Goal icon</h2>
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <GoalIcon iconKey="shield" color="var(--green)" />
        <GoalIcon iconKey="home" color="var(--gold)" />
        <GoalIcon iconKey="plane" color="var(--sky)" />
        <GoalIcon iconKey="car" color="oklch(72% 0.13 320)" />
        <GoalIcon iconKey="graduation" color="var(--green)" />
        <GoalIcon iconKey="heart" color="var(--rose)" />
        <GoalIcon iconKey="briefcase" color="var(--gold)" />
        <GoalIcon iconKey="smartphone" color="var(--sky)" />
        <GoalIcon iconKey="leaf" color="var(--green)" />
        <GoalIcon iconKey="coin" color="var(--gold)" />
        <GoalIcon iconKey="wrench" color="var(--text-3)" />
        <GoalIcon iconKey="gamepad" color="oklch(72% 0.13 320)" />
        <GoalIcon iconKey="star" color="var(--gold)" />
        <GoalIcon iconKey="flag" color="var(--rose)" />
        <GoalIcon iconKey="trend" color="var(--green)" />
        <GoalIcon iconKey="finance" color="var(--green)" />
        <GoalIcon iconKey="shield" color="var(--green)" size={48} />
    </div>
</section>
```

- [ ] **Step 3: Validar visualmente**

Acessar `https://vaultus.local/dev/design#goal-icon`. Esperado: 16 quadrados arredondados com ícones e cores temáticas + 1 maior. Bg suave com 16% de mix da cor, borda 32%.

- [ ] **Step 4: Commit**

```bash
git add src/resources/js/Components/GoalIcon.tsx src/resources/js/Pages/Dev/Design.tsx
git commit -m "feat(design): GoalIcon aceita iconKey arbitrário e color via color-mix"
```

---

## Task 2: Adicionar features opcionais ao `<AreaChart />` (gradient, gridlines, dual-series, tooltip)

**Files:**
- Modify: `src/resources/js/Components/charts/AreaChart.tsx`
- Modify: `src/resources/js/Pages/Dev/Design.tsx` (showcase com novas variantes)

**Motivação:** Tanto o `FlowAreaChart` do Finance quanto o `AreaChart` inline do Dashboard/Habits têm features que o novo AreaChart não tem:
- **Gradient** sob a linha (Dashboard, Habits) — fica mais editorial que `opacity: 0.14` plano
- **Gridlines** horizontais tracejadas (Dashboard, Habits, Finance)
- **Dual-series** com cores diferentes (Finance: receita verde + despesa gold tracejada)
- **Tooltip** ao hover com crosshair vertical (Finance)

- [ ] **Step 1: Substituir o conteúdo de `AreaChart.tsx`**

Conteúdo novo:

```tsx
import { useState, useId } from 'react'

interface Point {
  label: string
  value: number
}

interface DualSeries {
  income: number[]
  expense: number[]
  labels: string[]
  /** Color of income series (default var(--green)) */
  incomeColor?: string
  /** Color of expense series (default var(--gold)) */
  expenseColor?: string
  /** Optional formatter for tooltip values */
  format?: (n: number) => string
}

interface Props {
  /** Single series mode */
  data?: Point[]
  /** Dual-series mode (income vs expense). When set, ignores `data`. */
  dual?: DualSeries
  height?: number
  accent?: string
  showEndDot?: boolean
  /** Render a vertical gradient under the line. Default true. */
  gradient?: boolean
  /** Render horizontal dashed gridlines. Default false. */
  gridlines?: boolean
  /** Enable hover tooltip with crosshair (dual mode only). Default false. */
  showTooltip?: boolean
}

const PAD_X = 24
const PAD_TOP = 12
const PAD_BOTTOM = 28
const VB_W = 1000

export default function AreaChart({
  data,
  dual,
  height = 200,
  accent = 'var(--green)',
  showEndDot = true,
  gradient = true,
  gridlines = false,
  showTooltip = false,
}: Props) {
  if (dual) return <DualChart series={dual} height={height} gridlines={gridlines} showTooltip={showTooltip} />
  if (!data || data.length < 2) return null
  return (
    <SingleChart
      data={data}
      height={height}
      accent={accent}
      showEndDot={showEndDot}
      gradient={gradient}
      gridlines={gridlines}
    />
  )
}

function gridlineRows(h: number) {
  const innerH = h - PAD_TOP - PAD_BOTTOM
  return [0, 1, 2, 3].map((i) => PAD_TOP + i * (innerH / 3))
}

function SingleChart({
  data, height, accent, showEndDot, gradient, gridlines,
}: {
  data: Point[]
  height: number
  accent: string
  showEndDot: boolean
  gradient: boolean
  gridlines: boolean
}) {
  const id = useId().replace(/:/g, '')
  const innerH = height - PAD_TOP - PAD_BOTTOM
  const w = VB_W - PAD_X * 2

  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const stepX = w / (data.length - 1)

  const pts = data.map((p, i) => ({
    x: PAD_X + i * stepX,
    y: PAD_TOP + (1 - (p.value - min) / range) * innerH,
    label: p.label,
  }))

  const linePath = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
  const last = pts[pts.length - 1]
  const first = pts[0]
  const areaPath = `${linePath} L${last.x.toFixed(2)},${height - PAD_BOTTOM} L${first.x.toFixed(2)},${height - PAD_BOTTOM} Z`

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      aria-hidden="true"
    >
      {gradient && (
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {gridlines && gridlineRows(height).map((y, i) => (
        <line key={i} x1={PAD_X} x2={VB_W - PAD_X} y1={y} y2={y} stroke="var(--line-soft)" strokeWidth="1" strokeDasharray="2,4" />
      ))}
      <path d={areaPath} fill={gradient ? `url(#grad-${id})` : accent} fillOpacity={gradient ? 1 : 0.14} />
      <path d={linePath} fill="none" stroke={accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      {showEndDot && (
        <circle cx={last.x} cy={last.y} r="3.5" fill="var(--bg)" stroke={accent} strokeWidth={1.5} />
      )}
      {pts.map((p, i) => (
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
    </svg>
  )
}

function DualChart({
  series, height, gridlines, showTooltip,
}: {
  series: DualSeries
  height: number
  gridlines: boolean
  showTooltip: boolean
}) {
  const { income, expense, labels, incomeColor = 'var(--green)', expenseColor = 'var(--gold)', format } = series
  const [hover, setHover] = useState<number | null>(null)
  const innerH = height - PAD_TOP - PAD_BOTTOM
  const w = VB_W - PAD_X * 2
  const all = [...income, ...expense]
  if (all.length === 0 || labels.length < 2) return null
  const min = Math.min(...all) * 0.9
  const max = Math.max(...all) * 1.1 || 1
  const range = max - min || 1

  const ptX = (i: number) => PAD_X + (i / (labels.length - 1)) * w
  const ptY = (v: number) => PAD_TOP + (1 - (v - min) / range) * innerH
  const toLine = (arr: number[]) => arr.map((v, i) => `${i ? 'L' : 'M'}${ptX(i).toFixed(2)},${ptY(v).toFixed(2)}`).join(' ')
  const zoneW = w / (labels.length - 1)

  const fmt = format ?? ((n) => n.toFixed(0))

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${VB_W} ${height}`} width="100%" height={height} preserveAspectRatio="none">
        {gridlines && gridlineRows(height).map((y, i) => (
          <line key={i} x1={PAD_X} x2={VB_W - PAD_X} y1={y} y2={y} stroke="var(--line-soft)" strokeWidth="1" strokeDasharray="2,4" />
        ))}
        <path d={toLine(income)} fill="none" stroke={incomeColor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <path d={toLine(expense)} fill="none" stroke={expenseColor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4,3" />
        {labels.map((l, i) => (
          <text key={i} x={ptX(i)} y={height - 10} fontSize="10" fill="var(--text-4)" textAnchor="middle" fontFamily="var(--mono)">{l}</text>
        ))}
        {showTooltip && hover !== null && (
          <>
            <line x1={ptX(hover)} x2={ptX(hover)} y1={PAD_TOP} y2={height - PAD_BOTTOM} stroke="var(--line)" strokeWidth={1} />
            <circle cx={ptX(hover)} cy={ptY(income[hover])} r={3.5} fill={incomeColor} />
            <circle cx={ptX(hover)} cy={ptY(expense[hover])} r={3.5} fill={expenseColor} />
          </>
        )}
        {showTooltip && labels.map((_, i) => (
          <rect key={i} x={ptX(i) - zoneW / 2} y={0} width={zoneW} height={height - 12}
            fill="transparent" style={{ cursor: 'crosshair' }}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
        ))}
      </svg>
      {showTooltip && hover !== null && (() => {
        const net = income[hover] - expense[hover]
        const leftPct = ((ptX(hover) / VB_W) * 100).toFixed(1)
        return (
          <div style={{
            position: 'absolute', top: 4, left: `${leftPct}%`,
            transform: hover < labels.length / 2 ? 'translateX(8px)' : 'translateX(calc(-100% - 8px))',
            background: 'var(--surface-2)', border: '1px solid var(--line)',
            borderRadius: 8, padding: '8px 12px', fontSize: 11,
            fontFamily: 'var(--mono)', pointerEvents: 'none', zIndex: 10,
            whiteSpace: 'nowrap', boxShadow: 'var(--shadow-2)',
          }}>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 5 }}>{labels[hover]}</div>
            <div style={{ color: incomeColor, marginBottom: 2 }}>↑ {fmt(income[hover])}</div>
            <div style={{ color: expenseColor, marginBottom: 5 }}>↓ {fmt(expense[hover])}</div>
            <div style={{ color: net >= 0 ? 'var(--green)' : 'var(--rose)', borderTop: '1px solid var(--line-soft)', paddingTop: 4 }}>
              {net >= 0 ? '+' : ''}{fmt(net)}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
```

- [ ] **Step 2: Atualizar o showcase em `Pages/Dev/Design.tsx`**

Substituir a seção `<section id="area-chart">` por:

```tsx
<section id="area-chart">
    <h2 className="h-2" style={{ marginBottom: 16 }}>Area chart</h2>
    <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
            <div className="card-title"><b>PATRIMÔNIO</b> · 12 MESES (single + gradient + gridlines)</div>
        </div>
        <AreaChart gridlines data={[
            { label: 'Mai', value: 420 }, { label: 'Jun', value: 435 }, { label: 'Jul', value: 444 },
            { label: 'Ago', value: 451 }, { label: 'Set', value: 458 }, { label: 'Out', value: 462 },
            { label: 'Nov', value: 472 }, { label: 'Dez', value: 480 }, { label: 'Jan', value: 484 },
            { label: 'Fev', value: 490 }, { label: 'Mar', value: 494 }, { label: 'Abr', value: 498 },
            { label: 'Mai', value: 502 },
        ]} />
    </div>
    <div className="card">
        <div className="card-head">
            <div className="card-title"><b>FLUXO</b> · RECEITAS vs DESPESAS (dual + tooltip)</div>
        </div>
        <AreaChart
            height={180}
            gridlines
            showTooltip
            dual={{
                labels: ['Jun','Jul','Ago','Set','Out','Nov','Dez','Jan','Fev','Mar','Abr','Mai'],
                income:  [9.2, 9.4, 9.1, 9.6, 9.5, 9.8, 10.1, 9.9, 10.0, 10.2, 10.3, 10.5],
                expense: [6.4, 6.1, 6.7, 6.3, 6.9, 6.2, 6.8, 6.5, 7.0, 6.8, 6.6, 6.9],
                format: (n) => `R$ ${n.toFixed(1)}k`,
            }}
        />
    </div>
</section>
```

- [ ] **Step 3: Validar visualmente**

`/dev/design#area-chart` — esperado: chart single com gradient + gridlines tracejadas; chart dual com linha verde (receita sólida), gold tracejada (despesa), tooltip ao hover mostrando receita/despesa/líquido.

- [ ] **Step 4: Commit**

```bash
git add src/resources/js/Components/charts/AreaChart.tsx src/resources/js/Pages/Dev/Design.tsx
git commit -m "feat(design): AreaChart com gradient, gridlines, dual-series e tooltip opcionais"
```

---

## Task 3: Migrar `Finance/Index.tsx` para componentes canônicos

**Files:**
- Modify: `src/resources/js/Pages/Finance/Index.tsx`

- [ ] **Step 1: Trocar imports no topo**

No início do arquivo, **remover** as linhas 10-11:

```tsx
import FlowAreaChart from './components/charts/FlowAreaChart'
import DonutChart from './components/charts/DonutChart'
```

**Adicionar** depois do bloco de imports do `@inertiajs/react`/`@/Layouts`:

```tsx
import AreaChart from '@/Components/charts/AreaChart'
import Donut from '@/Components/charts/Donut'
```

- [ ] **Step 2: Substituir o `<FlowAreaChart />` no callsite**

Localizar a linha 146:

```tsx
<FlowAreaChart income={flow_chart.income} expense={flow_chart.expense} labels={flow_chart.labels} />
```

Substituir por:

```tsx
<AreaChart
  height={160}
  gridlines
  showTooltip
  dual={{
    income: flow_chart.income,
    expense: flow_chart.expense,
    labels: flow_chart.labels,
    format: (n) => fmtBRL(n),
  }}
/>
```

- [ ] **Step 3: Substituir o `<DonutChart />` por `<Donut />` + legenda**

Localizar o bloco (linhas ~155-158):

```tsx
{donut.length > 0
  ? <DonutChart segments={donut} center={{ label: 'Total', value: fmtBRL(net_worth, true) }} />
  : <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhuma conta cadastrada.</div>
}
```

Substituir por:

```tsx
{donut.length > 0 ? (
  <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
    <Donut
      size={160}
      thickness={14}
      data={donut.map(s => ({ label: s.label, value: s.pct, color: s.color }))}
      center={
        <div>
          <div className="kicker">Total</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--text)', marginTop: 2 }}>
            {fmtBRL(net_worth, true)}
          </div>
        </div>
      }
    />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
      {donut.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flex: 'none' }} />
          <span style={{ flex: 1 }}>{s.label}</span>
          <span className="mono muted">{s.pct}%</span>
        </div>
      ))}
    </div>
  </div>
) : (
  <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhuma conta cadastrada.</div>
)}
```

- [ ] **Step 4: Verificar visualmente**

`https://vaultus.local/finance` em dark+light. Esperado:
- Chart de fluxo mantém comportamento (linha verde, tracejada gold, tooltip ao hover, gridlines)
- Donut com legenda à direita, total em serifa no centro

- [ ] **Step 5: Commit**

```bash
git add src/resources/js/Pages/Finance/Index.tsx
git commit -m "refactor(finance): usar AreaChart/Donut canônicos no Index"
```

---

## Task 4: Migrar `GoalCard.tsx` para `<GoalIcon />` + `<Sparkline />` canônicos

**Files:**
- Modify: `src/resources/js/Pages/Finance/components/goals/GoalCard.tsx`
- Modify: `src/resources/js/Pages/Finance/components/goals/GoalModal.tsx`

- [ ] **Step 1: Trocar imports em `GoalCard.tsx`**

Remover linhas 6-7:

```tsx
import GoalIconBadge from './GoalIconBadge'
import Sparkline from '../charts/Sparkline'
```

Adicionar:

```tsx
import GoalIcon from '@/Components/GoalIcon'
import Sparkline from '@/Components/charts/Sparkline'
```

- [ ] **Step 2: Substituir uso de `GoalIconBadge` por `GoalIcon`**

Localizar linha ~27:

```tsx
<GoalIconBadge iconKey={g.icon} color={g.color} />
```

Substituir por:

```tsx
<GoalIcon iconKey={g.icon} color={g.color} size={44} />
```

- [ ] **Step 3: Ajustar o callsite do `Sparkline`**

Localizar linha ~90:

```tsx
<Sparkline data={g.history.length > 1 ? g.history : [0, g.current_amount / 1000]} color={g.color} />
```

A nova API usa `accent` (não `color`) e dimensões `width`/`height`. Substituir por:

```tsx
<Sparkline
  data={g.history.length > 1 ? g.history : [0, g.current_amount / 1000]}
  accent={g.color}
  width={140}
  height={28}
/>
```

- [ ] **Step 4: Atualizar `GoalModal.tsx` para importar `GOAL_ICON_MAP` do componente canônico**

Localizar linha 8 em `GoalModal.tsx`:

```tsx
import { GOAL_ICON_MAP } from './GoalIconBadge'
```

Substituir por:

```tsx
import { GOAL_ICON_MAP } from '@/Components/GoalIcon'
```

- [ ] **Step 5: Verificar visualmente**

`https://vaultus.local/finance` — cards de metas devem manter mesma estética. Modal de criação/edição de meta (`Nova meta`) deve listar os 16 ícones sem regressão.

- [ ] **Step 6: Commit**

```bash
git add src/resources/js/Pages/Finance/components/goals/GoalCard.tsx src/resources/js/Pages/Finance/components/goals/GoalModal.tsx
git commit -m "refactor(finance): GoalCard/Modal usam GoalIcon e Sparkline canônicos"
```

---

## Task 5: Deletar componentes antigos do Finance

**Files:**
- Delete: `src/resources/js/Pages/Finance/components/charts/Sparkline.tsx`
- Delete: `src/resources/js/Pages/Finance/components/charts/FlowAreaChart.tsx`
- Delete: `src/resources/js/Pages/Finance/components/charts/DonutChart.tsx`
- Delete: `src/resources/js/Pages/Finance/components/goals/GoalIconBadge.tsx`

- [ ] **Step 1: Confirmar que não há mais usos**

```bash
grep -rn "FlowAreaChart\|DonutChart\|GoalIconBadge" src/resources/js/Pages --include="*.tsx"
grep -rn "from '.*Finance/components/charts/Sparkline'" src/resources/js --include="*.tsx"
```

Expected: zero ocorrências (exceto definições dos próprios arquivos a serem deletados).

Se aparecer algum uso remanescente, parar e reportar. Não deletar com referências pendentes.

- [ ] **Step 2: Deletar os arquivos**

```bash
git rm src/resources/js/Pages/Finance/components/charts/Sparkline.tsx
git rm src/resources/js/Pages/Finance/components/charts/FlowAreaChart.tsx
git rm src/resources/js/Pages/Finance/components/charts/DonutChart.tsx
git rm src/resources/js/Pages/Finance/components/goals/GoalIconBadge.tsx
```

- [ ] **Step 3: Verificar tela do Finance ainda renderiza**

Acessar `https://vaultus.local/finance` — não deve haver erro de import quebrado.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(finance): remover componentes legados duplicados (Sparkline/FlowAreaChart/DonutChart/GoalIconBadge)"
```

---

## Task 6: Migrar `Dashboard/Index.tsx` para componentes canônicos

**Files:**
- Modify: `src/resources/js/Pages/Dashboard/Index.tsx`

**O Dashboard tem 4 componentes inline duplicados** (`Sparkline`, `AreaChart`, `HabitGrid`, `GoalIcon`) + a saudação hard-coded. Vamos migrar tudo.

- [ ] **Step 1: Adicionar imports no topo**

Após `import { PageProps } from '@/types'` (linha 5), adicionar:

```tsx
import Greeting from '@/Components/Greeting'
import GoalIcon from '@/Components/GoalIcon'
import Sparkline from '@/Components/charts/Sparkline'
import AreaChart from '@/Components/charts/AreaChart'
import Heatmap from '@/Components/charts/Heatmap'
```

- [ ] **Step 2: Remover os componentes inline duplicados**

Apagar:
- Linhas ~44-60 (função `Sparkline` inline)
- Linhas ~62-103 (função `AreaChart` inline)
- Linhas ~118-145 (função `HabitGrid` inline)
- Linhas ~147-154 (função `GoalIcon` inline)

Manter: `Mini` (helper específico do Dashboard).

- [ ] **Step 3: Trocar a saudação hard-coded por `<Greeting />`**

Localizar (~linhas 215-228):

```tsx
const hour = new Date().getHours()
const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

return (
  <AppLayout showHead={false} title="Dashboard">
    {/* Page heading */}
    <div className="page-head">
      <div className="page-head-left">
        <div className="eyebrow">
          <span>Painel</span>
          <span className="pill">Sincronizado · agora</span>
        </div>
        <h1 className="page-title">{greeting}, <em>{firstName}.</em></h1>
        ...
```

Substituir as 3 linhas (cálculo de hora + `<h1>`) por:

```tsx
return (
  <AppLayout showHead={false} title="Dashboard">
    {/* Page heading */}
    <div className="page-head">
      <div className="page-head-left">
        <div className="eyebrow">
          <span>Painel</span>
          <span className="pill">Sincronizado · agora</span>
        </div>
        <Greeting name={firstName} />
        ...
```

(deletando `const hour` e `const greeting`).

- [ ] **Step 4: Trocar callsites dos Sparkline nos stats**

Os 4 `<Sparkline data={...} color="..." />` (linhas ~240, 246, 252, 258) precisam virar `accent` em vez de `color`:

```tsx
<Sparkline data={wealth_chart.data.slice(-12)} accent="var(--green)" area />
```

```tsx
<Sparkline data={[3,5,4,7,6,8,5,6,4,5,3,stats.tasks_due_today]} accent="var(--gold)" area />
```

```tsx
<Sparkline data={[2,3,4,4,3,5,5,4,5,5,4,habDone]} accent="var(--green)" area />
```

```tsx
<Sparkline data={[1,2,2,3,3,4,4,4,5,5,stats.open_projects,stats.open_projects]} accent="var(--sky)" area />
```

(Note: o callsite original passava `Sparkline` sem nome de prop dimensional; o novo Sparkline usa defaults `width=80`/`height=24`, compatível com `.stat-spark` ≤ 80×24.)

- [ ] **Step 5: Trocar callsite do `<AreaChart />` do bloco "Patrimônio · 12 meses"**

Localizar (~linha 278):

```tsx
<AreaChart data={chartData.data} labels={chartData.labels} />
```

O novo AreaChart usa `data: Point[]` (não `data: number[] + labels: string[]`). Substituir por:

```tsx
<AreaChart
  height={180}
  gridlines
  data={chartData.data.map((value, i) => ({ label: chartData.labels[i] ?? '', value }))}
/>
```

- [ ] **Step 6: Trocar `<HabitGrid />` por `<Heatmap />`**

Localizar (~linha 329):

```tsx
<HabitGrid habits={habits_today} />
```

O `HabitGrid` antigo sintetizava dados via `(r*31+c*17+11)%100`. Para manter o comportamento até termos dados reais, mockamos as intensidades inline:

```tsx
<Heatmap
  cell={14}
  gap={3}
  labelWidth={68}
  rows={(habits_today.slice(0, 5)).map((h, r) => ({
    label: h.name,
    values: Array.from({ length: 12 }, (_, c) => {
      if (c === 11 && h.checked_in_today) return 1
      const x = (r * 31 + c * 17 + 11) % 100
      return x > 70 ? 0.9 : x > 45 ? 0.6 : x > 25 ? 0.3 : 0
    }),
  }))}
/>
```

E o fallback "Nenhum hábito ativo" (que estava dentro de `HabitGrid`) vira inline antes do `<Heatmap>`:

```tsx
{habits_today.length === 0 ? (
  <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhum hábito ativo.</div>
) : (
  <Heatmap ... />
)}
```

- [ ] **Step 7: Trocar uso do `GoalIcon` no bloco "Metas Financeiras"**

Localizar (~linha 391-394):

```tsx
<div style={{ width: 26, height: 26, borderRadius: 7, background: `color-mix(in oklab, var(--green) 16%, transparent)`, color: 'var(--green)', display: 'grid', placeItems: 'center', flex: 'none' }}>
  <GoalIcon category={g.category} size={13} />
</div>
```

Substituir por:

```tsx
<GoalIcon iconKey={categoryToIconKey(g.category)} color="var(--green)" size={26} />
```

E **adicionar** o helper `categoryToIconKey` próximo aos outros helpers (perto do `goalStatus` ~linha 176):

```tsx
function categoryToIconKey(category: string | null): string {
  if (category === 'Segurança') return 'shield'
  if (category === 'Patrimônio') return 'home'
  if (category === 'Experiência') return 'plane'
  return 'star'
}
```

- [ ] **Step 8: Verificar visualmente**

`https://vaultus.local/` — checar dark+light. Esperado:
- Saudação dinâmica funcionando
- Stats com sparklines (com área), cores corretas
- AreaChart "Patrimônio · 12 meses" com gradient e gridlines
- Heatmap de hábitos com 12 colunas × 5 linhas
- Metas com ícones temáticos

- [ ] **Step 9: Commit**

```bash
git add src/resources/js/Pages/Dashboard/Index.tsx
git commit -m "refactor(dashboard): migrar para Greeting/Sparkline/AreaChart/Heatmap/GoalIcon canônicos"
```

---

## Task 7: Migrar `Habits/Index.tsx`

**Files:**
- Modify: `src/resources/js/Pages/Habits/Index.tsx`

- [ ] **Step 1: Adicionar import canônico**

Após linha 7 (`import HealthMetricsPanel...`):

```tsx
import AreaChart from '@/Components/charts/AreaChart'
```

- [ ] **Step 2: Remover `AreaChart` inline**

Apagar a função `AreaChart` interna (linhas 17-49).

- [ ] **Step 3: Atualizar callsite**

Localizar (~linha 110):

```tsx
<AreaChart data={consistency.data} labels={consistency.labels} h={120} />
```

Substituir por:

```tsx
<AreaChart
  height={120}
  gridlines
  data={consistency.data.map((value, i) => ({ label: consistency.labels[i] ?? '', value }))}
/>
```

- [ ] **Step 4: Verificar visualmente**

`https://vaultus.local/habits` — chart "Consistência · 12 semanas" deve manter visual (gradient verde, gridlines tracejadas).

- [ ] **Step 5: Commit**

```bash
git add src/resources/js/Pages/Habits/Index.tsx
git commit -m "refactor(habits): usar AreaChart canônico no chart de consistência"
```

---

## Task 8: Migrar `Journal/Index.tsx` (MoodChart + accent-line)

**Files:**
- Modify: `src/resources/js/Pages/Journal/Index.tsx`

**Decisão:** Manter `JournalCalendar.tsx` como está — é um calendário acoplado a entradas com lógica própria de seleção. Substituir só o `MoodChart` inline e adicionar `.accent-line` na entrada "hoje".

- [ ] **Step 1: Adicionar import canônico**

Após linha 8 (`import PromptsPanel...`):

```tsx
import AreaChart from '@/Components/charts/AreaChart'
```

- [ ] **Step 2: Remover função `MoodChart` inline**

Apagar a função `MoodChart` (linhas 19-34).

- [ ] **Step 3: Atualizar callsite do `MoodChart`**

Localizar (~linha 77):

```tsx
<MoodChart data={mood_chart} />
```

Substituir por:

```tsx
<AreaChart
  height={60}
  gradient={false}
  showEndDot={false}
  data={mood_chart}
/>
```

(Note: `mood_chart` já é `{label, value}[]`, então passa direto.)

- [ ] **Step 4: Adicionar `.accent-line` no card de "Hoje"**

Localizar o `<div className="card" ...>` do card "Hoje" (~linha 99). Adicionar a classe `accent-line` à div interna do kicker/título.

Localizar:

```tsx
<div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
  <div>
    <div className="kicker">Hoje · {new Date(today + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}</div>
    <h2 className="h-display" style={{ marginTop: 4 }}>
      ...
```

Substituir o `<div>` interno (o que envolve `kicker` + `h-display`) por:

```tsx
<div className="accent-line">
  <div className="kicker">Hoje · {new Date(today + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}</div>
  <h2 className="h-display" style={{ marginTop: 4 }}>
    ...
```

- [ ] **Step 5: Verificar visualmente**

`https://vaultus.local/journal` — chart de humor agora usa primitiva canônica. Card "Hoje" tem barra verde fina à esquerda. Calendário continua igual.

- [ ] **Step 6: Commit**

```bash
git add src/resources/js/Pages/Journal/Index.tsx
git commit -m "refactor(journal): MoodChart via AreaChart canônico + accent-line no card de hoje"
```

---

## Task 9: Migrar `Tasks/Index.tsx` (Sparkline em stats)

**Files:**
- Modify: `src/resources/js/Pages/Tasks/Index.tsx`

A spec da Fase 2 prevê sparklines nos stats de Tarefas. Adicionar:

- [ ] **Step 1: Adicionar import**

Após linha 4 (`import { Icons }...`):

```tsx
import Sparkline from '@/Components/charts/Sparkline'
```

- [ ] **Step 2: Adicionar sparkline a cada stat card**

Localizar o `.map` de stats (~linha 67-80) e substituir por:

```tsx
{[
    { label: 'Hoje',        value: String(stats.today),     unit: `/ ${stats.today + stats.this_week}`, sub: `${stats.today} pendentes`, spark: [3,5,4,7,6,8,5,6,4,5,3,stats.today], accent: 'var(--green)' },
    { label: 'Atrasadas',   value: String(stats.overdue),   sub: stats.overdue === 0 ? 'bom trabalho' : 'requer atenção', spark: [1,2,1,3,2,4,2,3,2,1,2,stats.overdue], accent: stats.overdue > 0 ? 'var(--rose)' : 'var(--text-3)' },
    { label: 'Esta semana', value: String(stats.this_week), sub: 'prazo esta semana', spark: [8,10,7,9,11,8,10,9,7,8,10,stats.this_week], accent: 'var(--gold)' },
    { label: 'Sem prazo',   value: String(stats.no_due),    sub: 'ver Inbox', spark: [4,5,3,6,4,7,5,6,4,5,6,stats.no_due], accent: 'var(--sky)' },
].map((s, i) => (
    <div key={i} className="stat" style={{ padding: '16px 20px' }}>
        <div className="stat-label">{s.label}</div>
        <div className="stat-value" style={{ fontSize: 28 }}>
            {s.value}{s.unit && <span className="unit">{s.unit}</span>}
        </div>
        <div className="stat-delta flat" style={{ marginTop: 2 }}>{s.sub}</div>
        <div className="stat-spark">
            <Sparkline data={s.spark} accent={s.accent} area />
        </div>
    </div>
))}
```

- [ ] **Step 3: Verificar visualmente**

`https://vaultus.local/tasks` — stats agora têm mini-sparkline no canto inferior direito.

- [ ] **Step 4: Commit**

```bash
git add src/resources/js/Pages/Tasks/Index.tsx
git commit -m "refactor(tasks): Sparkline nos stats cards"
```

---

## Task 10: Migrar `Projects/Index.tsx` e `Library/Index.tsx` (Sparkline em stats)

**Files:**
- Modify: `src/resources/js/Pages/Projects/Index.tsx`
- Modify: `src/resources/js/Pages/Library/Index.tsx`

Adições simétricas ao Task 9.

- [ ] **Step 1: Em `Projects/Index.tsx`, adicionar import**

Após linha 4 (`import { Project, Want }...`):

```tsx
import Sparkline from '@/Components/charts/Sparkline'
```

- [ ] **Step 2: Em `Projects/Index.tsx`, adicionar sparkline aos stats**

Localizar o `.map` de stats (~linhas 38-49). Substituir por:

```tsx
{[
    { label: 'Ativos',     value: String(projects.data.filter(p => p.status === 'active').length), sub: 'projetos em andamento', spark: [2,3,3,4,4,5,4,4,5,5,5,projects.data.filter(p => p.status === 'active').length], accent: 'var(--green)' },
    { label: 'Em pausa',   value: String(projects.data.filter(p => p.status === 'paused').length), sub: 'aguardando retomada', spark: [1,1,2,2,1,2,3,2,2,1,1,projects.data.filter(p => p.status === 'paused').length], accent: 'var(--gold)' },
    { label: 'Concluídos', value: String(projects.data.filter(p => p.status === 'done').length),   sub: 'este ano', spark: [0,1,1,2,2,3,3,4,4,5,5,projects.data.filter(p => p.status === 'done').length], accent: 'var(--sky)' },
    { label: 'Vontades',   value: String(wants.data.length),                                       sub: 'prontas para promover', spark: [3,4,5,4,6,5,7,6,5,6,7,wants.data.length], accent: 'var(--text-3)' },
].map((s, i) => (
    <div key={i} className="stat" style={{ padding: '16px 20px' }}>
        <div className="stat-label">{s.label}</div>
        <div className="stat-value" style={{ fontSize: 28 }}>{s.value}</div>
        <div className="stat-delta flat" style={{ marginTop: 2 }}>{s.sub}</div>
        <div className="stat-spark">
            <Sparkline data={s.spark} accent={s.accent} area />
        </div>
    </div>
))}
```

- [ ] **Step 3: Em `Library/Index.tsx`, adicionar import**

Após linha 2 (`import { Icons }...`):

```tsx
import Sparkline from '@/Components/charts/Sparkline'
```

- [ ] **Step 4: Em `Library/Index.tsx`, adicionar sparkline aos stats**

Localizar o `.map` de stats (~linhas 52-63). Substituir por:

```tsx
{[
    { label: 'Livros · 2026',  value: String(stats.total_year),                  sub: `meta 24 · ${Math.round(stats.total_year / 24 * 100)}%`, spark: [1,2,3,3,4,5,6,7,8,9,10,stats.total_year], accent: 'var(--green)' },
    { label: 'Em curso',       value: String(stats.in_progress),                 sub: 'leituras ativas', spark: [1,2,1,2,3,2,3,2,3,2,3,stats.in_progress], accent: 'var(--gold)' },
    { label: 'Páginas no ano', value: stats.pages_year.toLocaleString('pt-BR'),  sub: 'páginas lidas', spark: [200,400,600,800,1100,1400,1700,2000,2400,2800,3200,stats.pages_year], accent: 'var(--green)' },
    { label: 'Na fila',        value: String(stats.queue_count),                 sub: 'prontos para ler', spark: [5,6,7,6,8,7,9,8,7,8,9,stats.queue_count], accent: 'var(--sky)' },
].map((s, i) => (
    <div key={i} className="stat" style={{ padding: '18px 22px' }}>
        <div className="stat-label">{s.label}</div>
        <div className="stat-value" style={{ fontSize: 28 }}>{s.value}</div>
        <div className="stat-delta flat" style={{ marginTop: 4 }}>{s.sub}</div>
        <div className="stat-spark">
            <Sparkline data={s.spark} accent={s.accent} area />
        </div>
    </div>
))}
```

- [ ] **Step 5: Verificar visualmente**

`https://vaultus.local/projects` e `https://vaultus.local/library` — stats com sparklines.

- [ ] **Step 6: Commit**

```bash
git add src/resources/js/Pages/Projects/Index.tsx src/resources/js/Pages/Library/Index.tsx
git commit -m "refactor(projects,library): Sparkline nos stats cards"
```

---

## Self-Review

**1. Spec coverage da Fase 2** (versus `2026-05-27-design-system-editorial-design.md` §"Fase 2"):

| Tela | Adições previstas | Coberto por |
|---|---|---|
| Dashboard | Greeting, Heatmap 12 sem, Sparkline 4 stats, AreaChart patrimônio, GoalIcon | T6 |
| Tarefas | Sparkline em stats | T9 |
| Projetos | Sparkline em stats | T10 |
| Hábitos | AreaChart consistência 12 sem | T7 |
| Diário | MiniCalendar, AreaChart humor, accent-line | T8 (MoodChart + accent-line; MiniCalendar **mantido como JournalCalendar** existente) |
| Finanças | Donut, AreaChart receitas vs despesas, Sparkline em stats, GoalIcon | T3 + T4 |
| Biblioteca | Sparkline em stats | T10 |

**Gap intencional:** A spec previa substituir o `JournalCalendar.tsx` pelo `<MiniCalendar />` canônico, mas o `JournalCalendar` tem lógica de seleção de data acoplada ao state do `JournalIndex`. Mantemos o componente atual e deixamos o `MiniCalendar` canônico disponível para os stubs (Fase 3). Esta decisão preserva funcionalidade existente.

**Gap intencional 2:** Sparkline em stats de Finanças. Os "BigStat cards" do Finance (T3) **não** têm `.stat-spark` slot atualmente — apenas valor + delta. Adicionar sparklines aqui exigiria reshape de layout. Adiamos para uma micro-task futura se necessário.

**2. Placeholder scan:** Conferido. Todas as tasks têm código completo. Sparklines mockados (T9, T10) usam arrays literais — fica claro que são placeholders visuais até backend fornecer séries reais (decisão consciente, alinhada com a Fase 1).

**3. Type consistency:**
- `GoalIcon` props: `iconKey: string`, `color?: string`, `size?: number` — usado consistentemente em T1, T4, T6.
- `Sparkline` props: `data: number[]`, `accent?: string`, `area?: boolean`, `width?: number`, `height?: number` — consistente.
- `AreaChart` props: `data?: Point[]` | `dual?: DualSeries`, `gradient?: boolean`, `gridlines?: boolean`, `showTooltip?: boolean` — consistente em T2, T3, T6, T7, T8.
- `Donut.data` esperado: `Slice[]` com `{ label, value, color }`. T3 mapeia `donut: DonutSegment[]` para essa forma.
- `Heatmap.rows`: `{ label, values: (number|null)[] }[]` — consistente em T6.

---

## Não-objetivos

- Refazer o `JournalCalendar.tsx` (mantido como está)
- Adicionar sparklines aos BigStat cards do Finance (layout precisa de slot, fora do escopo)
- Trocar dados sintetizados dos sparklines/heatmaps por dados reais do backend (requer endpoints novos)
- Refatoração além de substituir os componentes duplicados

---

## Ordem recomendada

T1 → T2 (consolidação) → T3 → T4 → T5 (Finance migração + cleanup) → T6 → T7 → T8 → T9 → T10 (outras telas).

Após T10, sugerir Fase 3 (stubs: Notas, Contatos, Revisão).
