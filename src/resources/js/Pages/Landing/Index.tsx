import { Head, Link } from '@inertiajs/react'
import { Icons } from '@/Components/Icons'
import { ComponentType, ReactNode } from 'react'

interface IconProps {
    size?: number
    className?: string
    strokeWidth?: number
}

const MODULES: { icon: ComponentType<IconProps>; title: string; desc: string }[] = [
    { icon: Icons.Finance, title: 'Finanças', desc: 'Contas, transações, metas, orçamento por categoria, recorrências, parcelamentos e relatórios — com valores criptografados em repouso.' },
    { icon: Icons.Habit, title: 'Hábitos', desc: 'Check-ins diários, frequência por dia da semana e taxa de adesão calculada no fuso correto.' },
    { icon: Icons.Task, title: 'Tarefas', desc: 'Inbox unificado com captura rápida e triagem — tudo que precisa ser feito, num lugar só.' },
    { icon: Icons.Project, title: 'Projetos', desc: 'Kanban por projeto com colunas, notas e links. Desejos e ideias podem ser promovidos a projeto.' },
    { icon: Icons.Journal, title: 'Diário', desc: 'Entradas com editor rico e prompts configuráveis para guiar a escrita do dia.' },
    { icon: Icons.Note, title: 'Notas', desc: 'Notas organizadas em cadernos, com histórico de versões a cada edição.' },
    { icon: Icons.Library, title: 'Biblioteca', desc: 'Livros e mídias com progresso de leitura e capas próprias.' },
    { icon: Icons.Contact, title: 'Contatos', desc: 'Sua rede pessoal e profissional, registrada fora do telefone.' },
    { icon: Icons.Review, title: 'Reviews', desc: 'Revisões semanais para fechar a semana e planejar a próxima.' },
]

const STRENGTHS: { title: string; desc: ReactNode }[] = [
    {
        title: 'Criptografia em repouso',
        desc: (
            <>
                Todo valor monetário é gravado criptografado no banco. Nem um dump do
                PostgreSQL expõe seu patrimônio — saldos e transações só existem em
                texto claro dentro da aplicação.
            </>
        ),
    },
    {
        title: 'Escritas idempotentes',
        desc: (
            <>
                Lançamentos financeiros usam <code>Idempotency-Key</code>: clique-duplo,
                retry de rede ou replay não duplicam uma transação. A primeira resposta
                é cacheada e re-emitida.
            </>
        ),
    },
    {
        title: 'Metas sem contabilidade dupla',
        desc: (
            <>
                Aporte em meta é uma transferência interna entre contas — não inflate
                receitas nem despesas. Seu patrimônio líquido permanece exato.
            </>
        ),
    },
    {
        title: 'Fuso horário correto, sempre',
        desc: (
            <>
                "Hoje", "esta semana" e "este mês" são calculados no seu fuso, não em
                UTC. Um check-in às 23h continua sendo de hoje.
            </>
        ),
    },
    {
        title: '2FA e trilha de auditoria',
        desc: (
            <>
                Login com senha + TOTP e registro de auditoria das ações sensíveis.
                Seus dados, com a postura de segurança que eles merecem.
            </>
        ),
    },
    {
        title: 'Self-hosted de verdade',
        desc: (
            <>
                Um <code>docker compose up</code> e o stack inteiro é seu: app, banco,
                filas e TLS. Nenhum dado sai da sua máquina.
            </>
        ),
    },
]

const STACK: { name: string; desc: string; tag: string }[] = [
    { name: 'Laravel 11 · PHP 8.4', desc: 'Backend domain-driven — cada módulo é um domínio isolado', tag: 'backend' },
    { name: 'React 19 · TypeScript', desc: 'SPA via Inertia.js, sem API REST intermediária', tag: 'frontend' },
    { name: 'PostgreSQL 16 · Redis 7', desc: 'Dados relacionais + cache, sessões e filas', tag: 'dados' },
    { name: 'Horizon · Scheduler', desc: 'Filas supervisionadas e rotinas agendadas', tag: 'jobs' },
    { name: 'Docker · Caddy', desc: 'Stack completo em containers, TLS automático', tag: 'infra' },
]

export default function Index() {
    return (
        <div className="landing">
            <Head title="Vaultus — Sua vida inteira, em ordem" />

            <header className="landing-topbar">
                <div className="landing-topbar-inner">
                    <span className="brand" style={{ padding: 0 }}>
                        <span className="brand-name" style={{ fontSize: 22 }}>Vaultus</span>
                        <span className="brand-dot" />
                    </span>
                    <nav className="landing-nav">
                        <a href="#modulos">Módulos</a>
                        <a href="#pontos-fortes">Pontos fortes</a>
                        <a href="#stack">Stack</a>
                    </nav>
                    <Link href="/login" className="btn btn-primary btn-sm" style={{ marginLeft: 16 }}>
                        Entrar
                    </Link>
                </div>
            </header>

            <section className="landing-hero">
                <div className="landing-wrap">
                    <div className="eyebrow rise rise-1">
                        <span className="pill">self-hosted</span>
                        gestão pessoal · finanças a diário
                    </div>
                    <h1 className="rise rise-2">
                        Sua vida inteira, <em>em ordem.</em>
                    </h1>
                    <p className="landing-hero-sub rise rise-3">
                        Vaultus reúne finanças, hábitos, projetos, diário e mais seis módulos
                        em um único cofre — rodando na sua máquina, com a disciplina de um
                        private bank e a estética de uma revista.
                    </p>
                    <div className="landing-hero-actions rise rise-4">
                        <Link href="/login" className="btn btn-primary">
                            Entrar no Vaultus <Icons.ArrowUpRight size={14} />
                        </Link>
                        <a href="#modulos" className="btn btn-ghost">Conhecer os módulos</a>
                    </div>
                    <p className="landing-hero-note rise rise-5" style={{ marginTop: 18 }}>
                        sem nuvem · sem assinatura · sem telemetria
                    </p>
                </div>
            </section>

            <div className="landing-wrap rise rise-5">
                <div className="landing-facts">
                    <div className="landing-fact">
                        <div className="landing-fact-value">9<span className="unit">módulos</span></div>
                        <div className="landing-fact-label">Um app, a vida toda</div>
                    </div>
                    <div className="landing-fact">
                        <div className="landing-fact-value">100<span className="unit">%</span></div>
                        <div className="landing-fact-label">Self-hosted, seus dados</div>
                    </div>
                    <div className="landing-fact">
                        <div className="landing-fact-value">AES-256</div>
                        <div className="landing-fact-label">Valores cifrados em repouso</div>
                    </div>
                    <div className="landing-fact">
                        <div className="landing-fact-value">2FA</div>
                        <div className="landing-fact-label">TOTP + trilha de auditoria</div>
                    </div>
                </div>
            </div>

            <section id="modulos" className="landing-section">
                <div className="landing-wrap">
                    <div className="landing-section-head">
                        <span className="landing-section-num">01 — Módulos</span>
                        <h2>Tudo que você <em>acompanha</em>, num lugar só</h2>
                        <span className="rule" />
                    </div>
                    <div className="landing-modules">
                        {MODULES.map(({ icon: Icon, title, desc }) => (
                            <article key={title} className="landing-module">
                                <span className="landing-module-icon"><Icon size={17} /></span>
                                <h3>{title}</h3>
                                <p>{desc}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section id="pontos-fortes" className="landing-section">
                <div className="landing-wrap">
                    <div className="landing-section-head">
                        <span className="landing-section-num">02 — Pontos fortes</span>
                        <h2>Construído como um <em>cofre</em></h2>
                        <span className="rule" />
                    </div>
                    <div className="landing-strengths">
                        {STRENGTHS.map(({ title, desc }, i) => (
                            <div key={title} className="landing-strength">
                                <span className="landing-strength-num">{String(i + 1).padStart(2, '0')}</span>
                                <h3>{title}</h3>
                                <p>{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="stack" className="landing-section">
                <div className="landing-wrap">
                    <div className="landing-section-head">
                        <span className="landing-section-num">03 — Stack</span>
                        <h2>Fundações <em>sólidas</em></h2>
                        <span className="rule" />
                    </div>
                    <div className="landing-stack">
                        {STACK.map(({ name, desc, tag }) => (
                            <div key={name} className="landing-stack-row">
                                <b>{name}</b>
                                <span>{desc}</span>
                                <span className="tag tag-green"><span className="dot" />{tag}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="landing-cta">
                <div className="landing-wrap">
                    <h2>Comece pelo <em>essencial.</em></h2>
                    <Link href="/login" className="btn btn-primary" style={{ position: 'relative' }}>
                        Entrar no Vaultus <Icons.ArrowUpRight size={14} />
                    </Link>
                </div>
            </section>

            <footer className="landing-footer">
                <div className="landing-wrap landing-footer-inner">
                    <span>VAULTUS — GESTÃO PESSOAL</span>
                    <span>LARAVEL + INERTIA + REACT · SELF-HOSTED</span>
                </div>
            </footer>
        </div>
    )
}
