import React, { useState } from 'react'
import { usePage, Link, router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { PageProps } from '@/types'
import Greeting from '@/Components/Greeting'
import GoalIcon from '@/Components/GoalIcon'
import Sparkline from '@/Components/charts/Sparkline'
import AreaChart from '@/Components/charts/AreaChart'
import Heatmap from '@/Components/charts/Heatmap'

/* ---- Tipos ---- */
interface TaskToday {
  id: number; title: string; project_name: string
  priority: 'high' | 'medium' | 'low' | null; due_at: string | null; is_done: boolean
}
interface DashProject {
  id: number; title: string; status: string; progress_percent: number
  next_task: string | null; tasks_done: number; tasks_total: number
}
interface Goal {
  id: number; name: string; category: string | null
  target_amount: number; current_amount: number
  progress_percent: number; deadline: string | null; is_completed: boolean
}
interface ReadingItem {
  id: number; title: string; author: string | null
  progress_percent: number; current_page: number; total_pages: number | null
}
interface JournalEntry {
  day: string; month: string; quote: string; mood: string; tag: string
}
interface Props {
  stats: {
    tasks_due_today: number; habits_done_today: number; habits_total: number
    journal_entries_this_month: number; open_projects: number; net_worth: number
    habit_streak: number; habit_rate: number; habit_top: string | null
    month_income: number; month_expense: number
  }
  journal_recent: JournalEntry[]
  habits_today: Array<{ id: number; name: string; icon: string | null; checked_in_today: boolean }>
  tasks_today: TaskToday[]
  projects: DashProject[]
  financial_goals: Goal[]
  wealth_chart: { labels: string[]; data: number[] }
  reading: ReadingItem[]
}

/* ---- Mini stat ---- */
function Mini({ label, value, delta, dir = 'flat' }: {
  label: string; value: string; delta?: string; dir?: 'up' | 'down' | 'flat'
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="kicker">{label}</div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--text)', letterSpacing: '-0.01em', marginTop: 4, lineHeight: 1.1 }}>{value}</div>
      {delta && <div className={`stat-delta ${dir}`} style={{ marginTop: 4 }}>{delta}</div>}
    </div>
  )
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  'no-prazo': { label: 'No prazo', cls: 'tag-green' },
  atencao:    { label: 'Atenção',  cls: 'tag-gold' },
  atrasado:   { label: 'Atrasado', cls: 'tag-rose' },
}

const PRIO_TAG: Record<string, string> = { high: 'tag-rose', medium: 'tag-gold', low: 'tag-sky' }
const PRIO_LABEL: Record<string, string> = { high: 'alta', medium: 'média', low: 'baixa' }

/* ---- Format helpers ---- */
function fmtNetWorth(v: number): { main: string; unit: string } {
  if (v >= 1_000_000) return { main: `R$ ${(v / 1_000_000).toFixed(1).replace('.', ',')}`, unit: 'M' }
  if (v >= 1_000)     return { main: `R$ ${(v / 1_000).toFixed(1).replace('.', ',')}`, unit: 'mil' }
  return { main: `R$ ${v.toFixed(0)}`, unit: '' }
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

function goalStatus(g: Goal): keyof typeof STATUS_MAP {
  if (g.is_completed) return 'no-prazo'
  if (g.progress_percent >= 80) return 'no-prazo'
  if (g.progress_percent >= 50) return 'atencao'
  return 'atrasado'
}

function categoryToIconKey(category: string | null): string {
  if (category === 'Segurança') return 'shield'
  if (category === 'Patrimônio') return 'home'
  if (category === 'Experiência') return 'plane'
  return 'star'
}

/* ---- Dashboard ---- */
export default function Dashboard({
  stats, journal_recent, habits_today,
  tasks_today, projects, financial_goals, wealth_chart, reading,
}: Props) {
  const { props: pageProps } = usePage<PageProps>()
  const firstName = pageProps.auth.user?.name.split(' ')[0] ?? 'você'
  const nw = fmtNetWorth(stats.net_worth)
  const habDone = stats.habits_done_today
  const habTotal = stats.habits_total || 5

  const [chartPeriod, setChartPeriod] = useState<'3M' | '6M' | '12M' | 'Tudo'>('12M')
  const chartData = (() => {
    const all = wealth_chart.data
    const labels = wealth_chart.labels
    if (chartPeriod === '3M')   return { data: all.slice(-4),  labels: labels.slice(-4)  }
    if (chartPeriod === '6M')   return { data: all.slice(-7),  labels: labels.slice(-7)  }
    if (chartPeriod === 'Tudo') return { data: all,            labels                      }
    return { data: all.slice(-13), labels: labels.slice(-13) }
  })()

  const [localTasks, setLocalTasks] = useState(tasks_today)
  function toggleTask(id: number) {
    const task = localTasks.find(t => t.id === id)
    if (!task) return
    setLocalTasks(prev => prev.map(t => t.id === id ? { ...t, is_done: !t.is_done } : t))
    router.patch(`/projects/tasks/${id}/toggle-done`, {}, {
      preserveScroll: true,
      onError: () => setLocalTasks(prev => prev.map(t => t.id === id ? { ...t, is_done: task.is_done } : t)),
    })
  }

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
          <div className="page-subtitle">Resumo do dia, focos pendentes e indicadores chave.</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Stats row */}
        <div className="grid g-4">
          <div className="stat">
            <div className="stat-label">Patrimônio Líquido</div>
            <div className="stat-value">{nw.main}{nw.unit && <span className="unit">{nw.unit}</span>}</div>
            <div className="stat-delta up"><Icons.ArrowUpRight size={12} /> +2,4% mês</div>
            <div className="stat-spark">
              <Sparkline data={wealth_chart.data.slice(-12)} accent="var(--green)" area />
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Tarefas Hoje</div>
            <div className="stat-value">{stats.tasks_due_today}<span className="unit">pendentes</span></div>
            <div className="stat-delta flat">ver lista completa</div>
            <div className="stat-spark">
              <Sparkline data={[3,5,4,7,6,8,5,6,4,5,3,stats.tasks_due_today]} accent="var(--gold)" area />
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Hábitos</div>
            <div className="stat-value">{habDone}<span className="unit">/ {habTotal} hoje</span></div>
            <div className="stat-delta up"><Icons.ArrowUpRight size={12} /> consistência</div>
            <div className="stat-spark">
              <Sparkline data={[2,3,4,4,3,5,5,4,5,5,4,habDone]} accent="var(--green)" area />
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Projetos Ativos</div>
            <div className="stat-value">{stats.open_projects}<span className="unit">em andamento</span></div>
            <div className="stat-delta flat">ver todos</div>
            <div className="stat-spark">
              <Sparkline data={[1,2,2,3,3,4,4,4,5,5,stats.open_projects,stats.open_projects]} accent="var(--sky)" area />
            </div>
          </div>
        </div>

        {/* Wealth chart + Foco de hoje */}
        <div className="grid g-12-5">
          <div className="card">
            <div className="card-head">
              <div>
                <div className="kicker" style={{ marginBottom: 6 }}>Patrimônio · 12 meses</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <h2 className="h-display">{nw.main}{nw.unit ? ` ${nw.unit}` : ''}</h2>
                </div>
              </div>
              <div className="seg">
                {(['3M', '6M', '12M', 'Tudo'] as const).map(p => (
                  <button key={p} data-active={chartPeriod === p} onClick={() => setChartPeriod(p)}>{p}</button>
                ))}
              </div>
            </div>
            <AreaChart
              height={180}
              gridlines
              data={chartData.data.map((value, i) => ({ label: chartData.labels[i] ?? '', value }))}
            />
            <div style={{ display: 'flex', gap: 32, marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--line-soft)' }}>
              <Mini label={`Receitas (${new Date().toLocaleString('pt-BR', { month: 'short' })})`} value={fmtBRL(stats.month_income)} delta="este mês" dir="up" />
              <Mini label={`Despesas (${new Date().toLocaleString('pt-BR', { month: 'short' })})`} value={fmtBRL(stats.month_expense)} delta="este mês" dir="flat" />
              <Mini label="Patrimônio líquido" value={fmtBRL(stats.net_worth)} delta="acumulado" dir="up" />
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Foco de Hoje</div>
              <Link href="/tasks" className="card-link">Ver agenda <Icons.ChevronRight size={11} /></Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {localTasks.length === 0 && (
                <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhuma tarefa para hoje.</div>
              )}
              {localTasks.map((t, i) => (
                <div key={t.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: i ? '1px solid var(--line-soft)' : 'none', alignItems: 'flex-start' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)', width: 48, paddingTop: 2 }}>{t.due_at ?? '—'}</div>
                  <div className="check" data-checked={t.is_done} onClick={() => toggleTask(t.id)} style={{ cursor: 'pointer' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ textDecoration: t.is_done ? 'line-through' : 'none', color: t.is_done ? 'var(--text-3)' : 'var(--text)', fontSize: 13.5 }}>{t.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="mono">{t.project_name}</span>
                      {t.priority && (
                        <span className={`tag ${PRIO_TAG[t.priority]}`}><span className="dot" />{PRIO_LABEL[t.priority]}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Habits heatmap + Recent activity */}
        <div className="grid g-12-5">
          <div className="card">
            <div className="card-head">
              <div className="card-title">Hábitos · <b>12 semanas</b></div>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
                <span>Menos</span>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[0,1,2,3].map(l => (
                    <div key={l} style={{ width: 10, height: 10, borderRadius: 2, background: ['var(--surface-2)','oklch(35% 0.06 var(--h))','oklch(50% 0.10 var(--h))','oklch(70% 0.14 var(--h))'][l] }} />
                  ))}
                </div>
                <span>Mais</span>
              </div>
            </div>
            {habits_today.length === 0 ? (
              <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhum hábito ativo.</div>
            ) : (
              <Heatmap
                cell={14}
                gap={3}
                labelWidth={68}
                rows={habits_today.slice(0, 5).map((h, r) => ({
                  label: h.name,
                  values: Array.from({ length: 12 }, (_, c) => {
                    if (c === 11 && h.checked_in_today) return 1
                    const x = (r * 31 + c * 17 + 11) % 100
                    return x > 70 ? 0.9 : x > 45 ? 0.6 : x > 25 ? 0.3 : 0
                  }),
                }))}
              />
            )}
            <div style={{ display: 'flex', gap: 24, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}>
              <Mini label="Streak Atual" value={`${stats.habit_streak} dias`} delta="recorde pessoal" />
              <Mini label="Taxa do mês" value={`${stats.habit_rate}%`} delta={stats.habit_rate >= 80 ? '+bom ritmo' : 'abaixo da meta'} dir={stats.habit_rate >= 80 ? 'up' : 'flat'} />
              <Mini label="Hábito top" value={stats.habit_top ?? '—'} delta="mais consistente" />
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Diário · <b>últimas entradas</b></div>
              <Link href="/journal" className="card-link">Abrir diário <Icons.ChevronRight size={11} /></Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {journal_recent.length === 0 ? (
                <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhuma entrada recente.</div>
              ) : journal_recent.map((j, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ textAlign: 'center', flex: 'none', width: 42, paddingTop: 2 }}>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 22, lineHeight: 1, color: 'var(--text)' }}>{j.day}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>{j.month}</div>
                  </div>
                  <div style={{ flex: 1, paddingLeft: 14, borderLeft: '1px solid var(--line-soft)' }}>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 15, fontStyle: 'italic', color: 'var(--text-2)', lineHeight: 1.4 }}>"{j.quote}"</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                      <span className="tag tag-green"><span className="dot" />{j.mood}</span>
                      {j.tag && <span className="kicker">{j.tag}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Metas financeiras */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Metas Financeiras</div>
              {financial_goals.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--text)', letterSpacing: '-0.015em' }}>
                    R$ {(financial_goals.reduce((s, g) => s + g.current_amount, 0) / 1000).toFixed(0)}k
                  </div>
                  <div className="mono muted" style={{ fontSize: 12 }}>
                    / {(financial_goals.reduce((s, g) => s + g.target_amount, 0) / 1000).toFixed(0)}k
                  </div>
                </div>
              )}
            </div>
            <Link href="/finance" className="card-link">Ver todas <Icons.ChevronRight size={11} /></Link>
          </div>
          {financial_goals.length === 0 ? (
            <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhuma meta cadastrada.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
              {financial_goals.map(g => {
                const pct = Math.min(100, Math.round(g.progress_percent))
                const st  = STATUS_MAP[goalStatus(g)]
                return (
                  <div key={g.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                      <GoalIcon iconKey={categoryToIconKey(g.category)} color="var(--green)" size={26} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span style={{ fontSize: 13.5, color: 'var(--text)' }}>{g.name}</span>
                          {g.deadline && <span className="mono muted-2" style={{ fontSize: 11 }}>· {g.deadline}</span>}
                        </div>
                      </div>
                      <span className={`tag ${st.cls}`} style={{ fontSize: 10 }}><span className="dot" />{st.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 38 }}>
                      <div className="meter" style={{ flex: 1 }}><span style={{ width: `${pct}%` }} /></div>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text-2)', minWidth: 100, textAlign: 'right' }}>
                        R$ {(g.current_amount / 1000).toFixed(0)}k <span style={{ color: 'var(--text-4)' }}>/ {(g.target_amount / 1000).toFixed(0)}k</span>
                      </span>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--green)', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Projetos + Leitura */}
        <div className="grid g-12-5">
          <div className="card">
            <div className="card-head">
              <div className="card-title">Projetos Ativos</div>
              <Link href="/projects" className="card-link">Ver todos <Icons.ChevronRight size={11} /></Link>
            </div>
            {projects.length === 0 ? (
              <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhum projeto ativo.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {projects.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div className="ring" style={{ '--p': p.progress_percent, '--size': '44px' } as React.CSSProperties}>
                      <span>{p.progress_percent}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="h-3">{p.title}</div>
                      {p.next_task && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{p.next_task}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.tasks_done}/{p.tasks_total} etapas</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Em leitura</div>
              <Link href="/library" className="card-link">Biblioteca <Icons.ChevronRight size={11} /></Link>
            </div>
            {reading.length === 0 ? (
              <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhum livro em leitura.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {reading.map(b => (
                  <div key={b.id} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div className="ph" style={{ width: 38, height: 54, flex: 'none' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="h-3" style={{ fontSize: 13.5 }}>{b.title}</div>
                      {b.author && <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 1 }}>{b.author}</div>}
                      {b.total_pages && (
                        <div className="meter" style={{ marginTop: 8 }}>
                          <span style={{ width: `${b.progress_percent}%` }} />
                        </div>
                      )}
                    </div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{b.progress_percent}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
