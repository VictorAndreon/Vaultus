import AppLayout from '@/Layouts/AppLayout'

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
            </div>
        </AppLayout>
    )
}
