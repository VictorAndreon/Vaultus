import AppLayout from '@/Layouts/AppLayout'
import Greeting from '@/Components/Greeting'
import GradientAvatar from '@/Components/GradientAvatar'
import GoalIcon from '@/Components/GoalIcon'
import Sparkline from '@/Components/charts/Sparkline'
import AreaChart from '@/Components/charts/AreaChart'

export default function DesignShowcase() {
    return (
        <AppLayout
            title="Design"
            eyebrow="Showcase"
            subtitle="Vitrine de componentes editoriais — uso interno."
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
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
                <section id="greeting">
                    <h2 className="h-2" style={{ marginBottom: 16 }}>Greeting</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <Greeting name="Victor" period="morning" />
                        <Greeting name="Victor" period="afternoon" />
                        <Greeting name="Victor" period="evening" />
                    </div>
                </section>
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
            </div>
        </AppLayout>
    )
}
