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
