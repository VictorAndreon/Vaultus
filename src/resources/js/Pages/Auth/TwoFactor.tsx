import { useForm } from '@inertiajs/react'
import { FormEvent } from 'react'

export default function TwoFactor() {
    const { data, setData, post, processing, errors } = useForm({ code: '' })

    function submit(e: FormEvent) {
        e.preventDefault()
        post('/two-factor')
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
            <div style={{ width: 360, padding: 32, background: '#1e293b', borderRadius: 12 }}>
                <h1 style={{ color: '#f8fafc', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Verificação em 2 Fatores</h1>
                <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>
                    Abra o app autenticador e insira o código de 6 dígitos.
                </p>

                <form onSubmit={submit}>
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', color: '#cbd5e1', fontSize: 14, marginBottom: 6 }}>Código</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]{6}"
                            maxLength={6}
                            value={data.code}
                            onChange={e => setData('code', e.target.value)}
                            autoFocus
                            style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc', fontSize: 22, letterSpacing: 8, textAlign: 'center', boxSizing: 'border-box' }}
                        />
                        {errors.code && <p style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>{errors.code}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        style={{ width: '100%', padding: 12, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: processing ? 'not-allowed' : 'pointer', opacity: processing ? 0.7 : 1 }}
                    >
                        {processing ? 'Verificando...' : 'Verificar'}
                    </button>
                </form>
            </div>
        </div>
    )
}
