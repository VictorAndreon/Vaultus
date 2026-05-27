# Fase 1 — Componentes Editoriais (Plano de Implementação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir os 10 componentes editoriais (charts SVG, MiniCalendar, Greeting, GradientAvatar, GoalIcon, `.accent-line`, polish do Ring) que faltam para fechar o gap estético contra o PDF de referência.

**Architecture:** Componentes presentational puros em React 19 + TypeScript estrito, SVG inline (zero dependências externas), reutilizando tokens OKLCH já definidos em `app.css`. Validação via página de showcase em rota oculta `/dev/design` — substitui o ciclo TDD num projeto sem framework de teste frontend.

**Tech Stack:** React 19, TypeScript strict, Inertia.js (Laravel), Tailwind (apenas reset), SVG inline, tokens CSS em `var(--*)`. Sem novas dependências.

**Referências:**
- Spec: `docs/superpowers/specs/2026-05-27-design-system-editorial-design.md`
- PDF: `~/Downloads/Vaultus — Sistema de controle de vida pessoal (Print).pdf`
- Design tokens: `src/resources/css/app.css`
- Convenção de import: `@/` → `src/resources/js/`
- URL local: `https://vaultus.local`

**Convenções gerais (válidas para todas as tasks):**
- TypeScript strict, sem `any`
- Cores SEMPRE via tokens (`var(--green)`, `var(--surface)`, etc) — nunca hex literal
- Charts são presentational (sem estado interno, sem tooltips por default)
- Cada componente deve renderizar bem em tema dark E light (toggle no topbar)
- Commits em PT-BR, padrão `feat(design): X`, sem co-autoria Claude (preferência do usuário)

---

## File Structure

**Criar:**
```
src/resources/js/Components/
├── charts/
│   ├── Heatmap.tsx          # Grid 12 semanas × N linhas com intensidade verde
│   ├── Donut.tsx            # Donut multi-fatia com total ao centro
│   ├── Sparkline.tsx        # Linha/área mini para .stat-spark
│   └── AreaChart.tsx        # Área de série única (12 meses)
├── Greeting.tsx             # "Boa noite, <em>Victor</em>." dinâmico
├── MiniCalendar.tsx         # Calendário mensal com heat por dia
├── GradientAvatar.tsx       # Avatar circular com iniciais + gradient verde
└── GoalIcon.tsx             # Quadrado com ícone temático colorido

src/resources/js/Pages/Dev/
└── Design.tsx               # Showcase de todos os componentes

src/app/Http/Controllers/Dev/
└── DesignShowcaseController.php  # Inertia::render('Dev/Design')
```

**Modificar:**
- `src/resources/css/app.css` — adicionar `.accent-line` utility + ajustar `.ring` para aceitar props via CSS vars
- `src/routes/web.php` — adicionar rota `/dev/design` (protegida por env local)

---

## Task 0: Showcase Page + Rota `/dev/design`

**Por quê primeiro:** sem framework de teste frontend, esta página é o nosso "test runner visual". Todas as tasks seguintes adicionam uma seção a ela.

**Files:**
- Create: `src/app/Http/Controllers/Dev/DesignShowcaseController.php`
- Create: `src/resources/js/Pages/Dev/Design.tsx`
- Modify: `src/routes/web.php`

- [ ] **Step 1: Criar Controller**

Conteúdo de `src/app/Http/Controllers/Dev/DesignShowcaseController.php`:

```php
<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class DesignShowcaseController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Dev/Design');
    }
}
```

- [ ] **Step 2: Criar página showcase**

Conteúdo de `src/resources/js/Pages/Dev/Design.tsx`:

```tsx
import AppLayout from '@/Layouts/AppLayout'

export default function DesignShowcase() {
    return (
        <AppLayout
            title="Design"
            eyebrow="Showcase"
            subtitle="Vitrine de componentes editoriais — uso interno."
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
                <section id="placeholder">
                    <h2 className="h-2" style={{ marginBottom: 16 }}>Aguardando componentes</h2>
                    <p className="muted">Cada task da Fase 1 adiciona uma seção aqui.</p>
                </section>
            </div>
        </AppLayout>
    )
}
```

- [ ] **Step 3: Adicionar rota (apenas em ambiente local)**

Em `src/routes/web.php`, adicionar dentro do bloco autenticado (ou onde houver as outras rotas internas), idealmente protegido por `app()->environment('local')`:

```php
if (app()->environment('local')) {
    Route::get('/dev/design', [\App\Http\Controllers\Dev\DesignShowcaseController::class, 'index'])
        ->name('dev.design');
}
```

- [ ] **Step 4: Validar visualmente**

```bash
# garantir que o dev server está rodando
docker compose ps  # ou comando equivalente do projeto
```

Abrir `https://vaultus.local/dev/design`. Esperado: vê o AppLayout com title "Design" e a seção placeholder. Confere tema dark E light.

- [ ] **Step 5: Commit**

```bash
git add src/app/Http/Controllers/Dev src/resources/js/Pages/Dev src/routes/web.php
git commit -m "feat(design): rota /dev/design para showcase de componentes editoriais"
```

---

## Task 1: `.accent-line` utility CSS + polish do `.ring`

**Files:**
- Modify: `src/resources/css/app.css`
- Modify: `src/resources/js/Pages/Dev/Design.tsx`

- [ ] **Step 1: Adicionar `.accent-line` ao app.css**

Adicionar ao final da seção de utilities (perto de `.muted`, `.kicker`):

```css
/* Accent line — borda esquerda verde para item ativo, entrada "hoje", quote */
.accent-line {
  position: relative;
  padding-left: 14px;
}
.accent-line::before {
  content: "";
  position: absolute;
  left: 0; top: 4px; bottom: 4px;
  width: 2px;
  background: var(--green);
  border-radius: 0 2px 2px 0;
}

/* Variante mais fechada para uso dentro de cards */
.accent-line-tight::before { top: 2px; bottom: 2px; }
```

- [ ] **Step 2: Atualizar `.ring` para aceitar props via CSS vars**

A regra `.ring` atual já usa `--p` e `--size`. Adicionar `--ring-color` e `--ring-track` opcionais, e variar a espessura:

Localizar e substituir o bloco `.ring` em `app.css`:

```css
.ring {
  --p: 65;
  --size: 64px;
  --ring-color: var(--green);
  --ring-track: var(--surface-3);
  --ring-thickness: 6px;
  width: var(--size); height: var(--size);
  border-radius: 50%;
  background: conic-gradient(var(--ring-color) calc(var(--p) * 1%), var(--ring-track) 0);
  display: grid; place-items: center; position: relative;
}
.ring::after {
  content: "";
  position: absolute;
  inset: var(--ring-thickness);
  border-radius: 50%;
  background: var(--surface);
}
.ring > span {
  position: relative;
  font-family: var(--mono);
  font-size: 13px;
  color: var(--text);
  z-index: 1;
}
```

- [ ] **Step 3: Adicionar seção de showcase**

Em `src/resources/js/Pages/Dev/Design.tsx`, substituir a seção placeholder por:

```tsx
<section id="accent-line">
    <h2 className="h-2" style={{ marginBottom: 16 }}>Accent line</h2>
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="accent-line">
            <div className="kicker">HOJE · TERÇA-FEIRA</div>
            <div className="h-3">Sessão de escrita — Diário</div>
        </div>
        <div className="accent-line">
            <em>"What you measure, you understand. What you write down, you remember."</em>
        </div>
    </div>
</section>

<section id="ring">
    <h2 className="h-2" style={{ marginBottom: 16 }}>Ring</h2>
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <div className="ring" style={{ ['--p' as string]: 68 }}><span>68%</span></div>
        <div className="ring" style={{ ['--p' as string]: 24, ['--size' as string]: '48px' }}><span>24%</span></div>
        <div className="ring" style={{ ['--p' as string]: 92, ['--size' as string]: '96px', ['--ring-thickness' as string]: '10px' }}><span>92%</span></div>
    </div>
</section>
```

- [ ] **Step 4: Validar visualmente**

Abrir `https://vaultus.local/dev/design`. Esperado: linha verde fina à esquerda em ambos os items "accent-line"; três rings de tamanhos diferentes com percentuais. Conferir tema light.

- [ ] **Step 5: Commit**

```bash
git add src/resources/css/app.css src/resources/js/Pages/Dev/Design.tsx
git commit -m "feat(design): utility .accent-line e polish do .ring"
```

---

## Task 2: `<Greeting />`

**Files:**
- Create: `src/resources/js/Components/Greeting.tsx`
- Modify: `src/resources/js/Pages/Dev/Design.tsx`

- [ ] **Step 1: Criar componente**

Conteúdo de `src/resources/js/Components/Greeting.tsx`:

```tsx
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
```

- [ ] **Step 2: Adicionar seção ao showcase**

Adicionar no `Design.tsx` (antes do fim do `<div>` flex):

```tsx
<section id="greeting">
    <h2 className="h-2" style={{ marginBottom: 16 }}>Greeting</h2>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Greeting name="Victor" period="morning" />
        <Greeting name="Victor" period="afternoon" />
        <Greeting name="Victor" period="evening" />
    </div>
</section>
```

E adicionar o import no topo:

```tsx
import Greeting from '@/Components/Greeting'
```

- [ ] **Step 3: Validar visualmente**

Abrir `https://vaultus.local/dev/design`. Esperado: 3 saudações em serifa grande, "Victor" em itálico verde. Conferir light theme.

- [ ] **Step 4: Commit**

```bash
git add src/resources/js/Components/Greeting.tsx src/resources/js/Pages/Dev/Design.tsx
git commit -m "feat(design): componente Greeting com saudação dinâmica"
```

---

## Task 3: `<GradientAvatar />`

**Files:**
- Create: `src/resources/js/Components/GradientAvatar.tsx`
- Modify: `src/resources/js/Pages/Dev/Design.tsx`

- [ ] **Step 1: Criar componente**

Conteúdo de `src/resources/js/Components/GradientAvatar.tsx`:

```tsx
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
```

> Nota: a classe `.avatar` já existe em `app.css` (linha ~198) e cuida do gradient verde, formato circular, font mono. Este componente é só um wrapper tipado.

- [ ] **Step 2: Adicionar seção ao showcase**

```tsx
<section id="gradient-avatar">
    <h2 className="h-2" style={{ marginBottom: 16 }}>Gradient avatar</h2>
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <GradientAvatar initials="HC" size={30} />
        <GradientAvatar initials="PA" size={40} />
        <GradientAvatar initials="RM" size={56} />
        <GradientAvatar initials="LT" size={72} />
        <GradientAvatar initials="BL" size={56} hue={85} />
        <GradientAvatar initials="MS" size={56} hue={230} />
    </div>
</section>
```

Import:

```tsx
import GradientAvatar from '@/Components/GradientAvatar'
```

- [ ] **Step 3: Validar visualmente**

Esperado: avatares circulares com gradient verde, iniciais em mono branco. Os dois últimos (hue=85, 230) ficam em gradients gold/sky.

- [ ] **Step 4: Commit**

```bash
git add src/resources/js/Components/GradientAvatar.tsx src/resources/js/Pages/Dev/Design.tsx
git commit -m "feat(design): componente GradientAvatar"
```

---

## Task 4: `<GoalIcon />`

**Files:**
- Create: `src/resources/js/Components/GoalIcon.tsx`
- Modify: `src/resources/js/Pages/Dev/Design.tsx`

- [ ] **Step 1: Criar componente**

Conteúdo de `src/resources/js/Components/GoalIcon.tsx`:

```tsx
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
```

- [ ] **Step 2: Adicionar seção ao showcase**

```tsx
<section id="goal-icon">
    <h2 className="h-2" style={{ marginBottom: 16 }}>Goal icon</h2>
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <GoalIcon variant="shield" />
        <GoalIcon variant="home" />
        <GoalIcon variant="plane" />
        <GoalIcon variant="car" />
        <GoalIcon variant="shield" size={48} />
    </div>
</section>
```

Import:

```tsx
import GoalIcon from '@/Components/GoalIcon'
```

- [ ] **Step 3: Validar visualmente**

Esperado: 4 quadrados arredondados com ícones temáticos (escudo verde, casa gold, avião azul, carro púrpura). Mesma estética dos cards de meta no PDF (pg. 7).

- [ ] **Step 4: Commit**

```bash
git add src/resources/js/Components/GoalIcon.tsx src/resources/js/Pages/Dev/Design.tsx
git commit -m "feat(design): componente GoalIcon com variantes shield/home/plane/car"
```

---

## Task 5: `<Sparkline />`

**Files:**
- Create: `src/resources/js/Components/charts/Sparkline.tsx`
- Modify: `src/resources/js/Pages/Dev/Design.tsx`

- [ ] **Step 1: Criar componente**

Conteúdo de `src/resources/js/Components/charts/Sparkline.tsx`:

```tsx
interface Props {
  data: number[]
  width?: number
  height?: number
  /** Color of stroke (default: var(--green)) */
  accent?: string
  /** If true, fill area under the line with a soft version of accent */
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
      <path d={linePath} fill="none" stroke={accent} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
```

- [ ] **Step 2: Adicionar seção ao showcase**

```tsx
<section id="sparkline">
    <h2 className="h-2" style={{ marginBottom: 16 }}>Sparkline</h2>
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <Sparkline data={[3, 5, 4, 8, 6, 9, 11, 10, 13]} />
        <Sparkline data={[10, 9, 11, 7, 8, 6, 5, 4, 3]} accent="var(--danger)" />
        <Sparkline data={[2, 4, 3, 5, 6, 4, 7, 8, 6]} area />
        <Sparkline data={[5, 5, 5, 5, 5]} accent="var(--text-3)" />
    </div>

    <h3 className="h-3" style={{ marginTop: 24, marginBottom: 12 }}>Embutido em .stat</h3>
    <div className="stat" style={{ maxWidth: 260 }}>
        <div className="stat-label">Patrimônio líquido</div>
        <div className="stat-value">R$ 501,8 <span className="unit">mil</span></div>
        <div className="stat-delta up">↗ +2,4% mês</div>
        <div className="stat-spark">
            <Sparkline data={[3, 5, 4, 7, 6, 8, 11, 10, 13, 12, 14, 15]} area />
        </div>
    </div>
</section>
```

Import:

```tsx
import Sparkline from '@/Components/charts/Sparkline'
```

- [ ] **Step 3: Validar visualmente**

Esperado: 4 mini-linhas (ascendente verde, descendente vermelha, com área, linha reta neutra). O `.stat` com sparkline no canto inferior-direito bate com a estética do PDF pg. 2.

- [ ] **Step 4: Commit**

```bash
git add src/resources/js/Components/charts/Sparkline.tsx src/resources/js/Pages/Dev/Design.tsx
git commit -m "feat(design): componente Sparkline (SVG puro)"
```

---

## Task 6: `<AreaChart />`

**Files:**
- Create: `src/resources/js/Components/charts/AreaChart.tsx`
- Modify: `src/resources/js/Pages/Dev/Design.tsx`

- [ ] **Step 1: Criar componente**

Conteúdo de `src/resources/js/Components/charts/AreaChart.tsx`:

```tsx
interface Point {
  label: string
  value: number
}

interface Props {
  data: Point[]
  height?: number
  accent?: string
  /** Show last point as a circle marker */
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
    <svg viewBox={`0 0 1000 ${height}`} preserveAspectRatio="none" width="100%" height={height} aria-hidden="true">
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

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(2)},${height - PAD_BOTTOM} L${points[0].x.toFixed(2)},${height - PAD_BOTTOM} Z`

  const end = points[points.length - 1]

  return (
    <>
      <path d={areaPath} fill={accent} opacity={0.14} />
      <path d={linePath} fill="none" stroke={accent} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      {showEndDot && (
        <>
          <circle cx={end.x} cy={end.y} r="3.5" fill="var(--bg)" stroke={accent} strokeWidth={1.5} />
        </>
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
```

- [ ] **Step 2: Adicionar seção ao showcase**

```tsx
<section id="area-chart">
    <h2 className="h-2" style={{ marginBottom: 16 }}>Area chart</h2>
    <div className="card">
        <div className="card-head">
            <div className="card-title"><b>PATRIMÔNIO</b> · 12 MESES</div>
        </div>
        <AreaChart data={[
            { label: 'Mai', value: 420 },
            { label: 'Jun', value: 435 },
            { label: 'Jul', value: 444 },
            { label: 'Ago', value: 451 },
            { label: 'Set', value: 458 },
            { label: 'Out', value: 462 },
            { label: 'Nov', value: 472 },
            { label: 'Dez', value: 480 },
            { label: 'Jan', value: 484 },
            { label: 'Fev', value: 490 },
            { label: 'Mar', value: 494 },
            { label: 'Abr', value: 498 },
            { label: 'Mai', value: 502 },
        ]} />
    </div>
</section>
```

Import:

```tsx
import AreaChart from '@/Components/charts/AreaChart'
```

- [ ] **Step 3: Validar visualmente**

Esperado: linha verde ascendente com área preenchida sutilmente, labels mono nos meses, ponto circular no fim. Bate com o gráfico "Patrimônio · 12 meses" do PDF pg. 2.

- [ ] **Step 4: Commit**

```bash
git add src/resources/js/Components/charts/AreaChart.tsx src/resources/js/Pages/Dev/Design.tsx
git commit -m "feat(design): componente AreaChart (SVG puro)"
```

---

## Task 7: `<Donut />`

**Files:**
- Create: `src/resources/js/Components/charts/Donut.tsx`
- Modify: `src/resources/js/Pages/Dev/Design.tsx`

- [ ] **Step 1: Criar componente**

Conteúdo de `src/resources/js/Components/charts/Donut.tsx`:

```tsx
interface Slice {
  label: string
  value: number
  color: string
}

interface Props {
  data: Slice[]
  size?: number
  thickness?: number
  /** Optional content rendered at the center (e.g., total) */
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
```

- [ ] **Step 2: Adicionar seção ao showcase**

```tsx
<section id="donut">
    <h2 className="h-2" style={{ marginBottom: 16 }}>Donut</h2>
    <div className="card" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
        <Donut
            size={160}
            thickness={16}
            center={
                <div>
                    <div className="kicker">TOTAL</div>
                    <div className="h-2">R$ 501k</div>
                </div>
            }
            data={[
                { label: 'Ações', value: 38, color: 'var(--green)' },
                { label: 'Renda fixa', value: 28, color: 'var(--gold)' },
                { label: 'FIIs', value: 14, color: 'var(--sky)' },
                { label: 'Cripto', value: 6, color: 'oklch(72% 0.13 320)' },
                { label: 'Caixa', value: 14, color: 'var(--text-4)' },
            ]}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
            <div><span style={{ color: 'var(--green)' }}>●</span> Ações <span className="muted">38%</span></div>
            <div><span style={{ color: 'var(--gold)' }}>●</span> Renda fixa <span className="muted">28%</span></div>
            <div><span style={{ color: 'var(--sky)' }}>●</span> FIIs <span className="muted">14%</span></div>
            <div><span style={{ color: 'oklch(72% 0.13 320)' }}>●</span> Cripto <span className="muted">6%</span></div>
            <div><span style={{ color: 'var(--text-4)' }}>●</span> Caixa <span className="muted">14%</span></div>
        </div>
    </div>
</section>
```

Import:

```tsx
import Donut from '@/Components/charts/Donut'
```

- [ ] **Step 3: Validar visualmente**

Esperado: donut com 5 fatias coloridas (verde, gold, sky, púrpura, neutro), total "R$ 501k" em serifa no centro, legenda à direita. Bate com o gráfico de Alocação Patrimônio do PDF pg. 6.

- [ ] **Step 4: Commit**

```bash
git add src/resources/js/Components/charts/Donut.tsx src/resources/js/Pages/Dev/Design.tsx
git commit -m "feat(design): componente Donut (SVG puro)"
```

---

## Task 8: `<Heatmap />`

**Files:**
- Create: `src/resources/js/Components/charts/Heatmap.tsx`
- Modify: `src/resources/js/Pages/Dev/Design.tsx`

- [ ] **Step 1: Criar componente**

Conteúdo de `src/resources/js/Components/charts/Heatmap.tsx`:

```tsx
interface Row {
  label: string
  /** Values 0..1 per week (or null for "no data") */
  values: (number | null)[]
}

interface Props {
  rows: Row[]
  /** Cell size in pixels */
  cell?: number
  /** Gap between cells in pixels */
  gap?: number
  /** Width reserved for row labels */
  labelWidth?: number
}

/**
 * Maps a 0..1 intensity to one of 5 discrete green shades, matching the PDF.
 * 0 (or null) → empty, 1 → brightest green.
 */
function shade(value: number | null): string {
  if (value === null) return 'var(--surface-3)'
  if (value <= 0)    return 'var(--surface-3)'
  if (value < 0.25)  return 'oklch(28% 0.05 var(--h))'
  if (value < 0.5)   return 'oklch(38% 0.09 var(--h))'
  if (value < 0.75)  return 'oklch(56% 0.12 var(--h))'
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
```

- [ ] **Step 2: Adicionar seção ao showcase**

```tsx
<section id="heatmap">
    <h2 className="h-2" style={{ marginBottom: 16 }}>Heatmap</h2>
    <div className="card">
        <div className="card-head">
            <div className="card-title">HÁBITOS · <b>12 SEMANAS</b></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-3)' }}>
                Menos
                <span style={{ width: 10, height: 10, background: 'var(--surface-3)', borderRadius: 2 }} />
                <span style={{ width: 10, height: 10, background: 'oklch(38% 0.09 var(--h))', borderRadius: 2 }} />
                <span style={{ width: 10, height: 10, background: 'var(--green-bright)', borderRadius: 2 }} />
                Mais
            </div>
        </div>
        <Heatmap rows={[
            { label: 'Leitura',   values: [0.7, 0.9, 0.8, 1, 0.6, 0.9, 0.7, 1, 0.8, 0.9, 1, 1] },
            { label: 'Exercício', values: [0.5, 0.7, 0.9, 0.6, 0.8, 0.5, 0.7, 0.6, 0.9, 0.8, 0.7, 1] },
            { label: 'Meditação', values: [1, 0.9, 0, 0.6, 0.8, 1, 0.7, 0, 0.5, 0.9, 0.8, 0.7] },
            { label: 'Sono 7h+',  values: [0.3, 0.5, 0.4, 0.6, 0.8, 0.3, 0.5, 0.7, 0.4, 0.8, 0.9, 0.6] },
            { label: 'Sem álcool',values: [0.6, 0.8, 0.7, 0.5, 0.9, 0.7, 0.8, 0.6, 0.9, 0.7, 0.8, 1] },
        ]} />
    </div>
</section>
```

Import:

```tsx
import Heatmap from '@/Components/charts/Heatmap'
```

- [ ] **Step 3: Validar visualmente**

Esperado: grid 12 colunas × 5 linhas com células em tons graduados de verde (escuro→claro), labels à esquerda em mono, legenda "Menos ··· Mais" no header. Bate com o heatmap do PDF pg. 2.

- [ ] **Step 4: Commit**

```bash
git add src/resources/js/Components/charts/Heatmap.tsx src/resources/js/Pages/Dev/Design.tsx
git commit -m "feat(design): componente Heatmap (SVG puro)"
```

---

## Task 9: `<MiniCalendar />`

**Files:**
- Create: `src/resources/js/Components/MiniCalendar.tsx`
- Modify: `src/resources/js/Pages/Dev/Design.tsx`

- [ ] **Step 1: Criar componente**

Conteúdo de `src/resources/js/Components/MiniCalendar.tsx`:

```tsx
import { useState } from 'react'

interface Props {
  /** Year (e.g., 2026). Defaults to current. */
  year?: number
  /** Month 0..11 (e.g., 4 = May). Defaults to current. */
  month?: number
  /** Map of day-number → intensity (0..1). Days not in map render as empty. */
  intensity?: Record<number, number>
  /** Day to highlight as 'today' (number, in the current month). */
  today?: number
  /** Days with entries (gets a 'has-entry' style, even without intensity). */
  entries?: number[]
  /** Callback when navigation buttons are pressed (delta = -1 or +1) */
  onNavigate?: (delta: -1 | 1) => void
}

const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function shade(value: number | undefined): string {
  if (value === undefined || value <= 0) return 'transparent'
  if (value < 0.34) return 'oklch(32% 0.06 var(--h))'
  if (value < 0.67) return 'oklch(48% 0.115 var(--h))'
  return 'var(--green)'
}

export default function MiniCalendar({
  year: yearProp,
  month: monthProp,
  intensity = {},
  today,
  entries = [],
  onNavigate,
}: Props) {
  const now = new Date()
  const [year] = useState(yearProp ?? now.getFullYear())
  const [month] = useState(monthProp ?? now.getMonth())

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const entriesSet = new Set(entries)

  return (
    <div className="card" style={{ padding: 16, width: 240 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="card-title">
          {MONTH_LABELS[month].toUpperCase().slice(0, 3)} · <b>{year}</b>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="icon-btn" style={{ width: 22, height: 22 }} onClick={() => onNavigate?.(-1)} aria-label="Mês anterior">‹</button>
          <button className="icon-btn" style={{ width: 22, height: 22 }} onClick={() => onNavigate?.(1)}  aria-label="Próximo mês">›</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={i}
            style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-4)', textAlign: 'center', padding: 4 }}
          >
            {label}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />
          const isToday = day === today
          const hasEntry = entriesSet.has(day)
          const bg = shade(intensity[day])
          return (
            <div
              key={i}
              style={{
                aspectRatio: '1',
                display: 'grid',
                placeItems: 'center',
                fontSize: 11,
                fontFamily: 'var(--mono)',
                color: hasEntry ? 'var(--text)' : 'var(--text-4)',
                borderRadius: 4,
                background: bg,
                border: isToday ? '1px solid var(--green)' : '1px solid transparent',
              }}
            >
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Adicionar seção ao showcase**

```tsx
<section id="mini-calendar">
    <h2 className="h-2" style={{ marginBottom: 16 }}>Mini calendar</h2>
    <MiniCalendar
        year={2026}
        month={4}
        today={12}
        entries={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
        intensity={{
            1: 0.7, 2: 0.4, 3: 0.6, 4: 0.3, 5: 0.8, 6: 0.5, 7: 0.9,
            8: 0.7, 9: 0.4, 10: 0.6, 11: 0.5, 12: 1,
        }}
    />
</section>
```

Import:

```tsx
import MiniCalendar from '@/Components/MiniCalendar'
```

- [ ] **Step 3: Validar visualmente**

Esperado: calendário compacto "MAI · 2026" com header de dias da semana em mono, células com tons de verde nos dias com entrada, dia 12 (hoje) com borda verde. Bate com o calendário do PDF pg. 5 (Diário).

- [ ] **Step 4: Commit**

```bash
git add src/resources/js/Components/MiniCalendar.tsx src/resources/js/Pages/Dev/Design.tsx
git commit -m "feat(design): componente MiniCalendar com heat por dia"
```

---

## Self-Review (executado)

**1. Spec coverage** — cada item da spec Fase 1:
- ✅ Heatmap (Task 8)
- ✅ Donut (Task 7)
- ✅ Sparkline (Task 5)
- ✅ AreaChart (Task 6)
- ✅ Ring polish (Task 1)
- ✅ .accent-line (Task 1)
- ✅ MiniCalendar (Task 9)
- ✅ Greeting (Task 2)
- ✅ GradientAvatar (Task 3)
- ✅ GoalIcon (Task 4)

**2. Placeholder scan** — sem "TBD", sem "handle edge cases", sem código omitido. Cada step com código completo.

**3. Type consistency** — `keyof typeof Icons` em GoalIcon usa o objeto `Icons` real (`src/resources/js/Components/Icons.tsx`). `Sparkline` `data: number[]` é simples. `AreaChart` `data: Point[]` consistente. `Donut` `Slice`/`color: string`. `Heatmap` `Row[]` com `values: (number | null)[]`. Sem divergências entre tasks.

**4. Variáveis CSS usadas que não existem em app.css** — verificado:
- `--green`, `--green-bright`, `--green-deep`, `--green-soft`, `--green-wash` ✓
- `--gold`, `--rose`, `--sky` ✓
- `--surface`, `--surface-2`, `--surface-3` ✓
- `--text`, `--text-3`, `--text-4` ✓
- `--bg`, `--mono`, `--danger` ✓
- `--h` (hue) ✓
- `--r-2`, `--r-3` ✓

Tudo coerente.

---

## Critério de pronto

Todas as 10 tasks com commit, abrir `https://vaultus.local/dev/design` e verificar visualmente cada seção tanto em dark quanto light theme. A Fase 1 entrega componentes isolados e usáveis — a integração nas telas reais (Fase 2) é o próximo plano.
