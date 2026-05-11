import { useForm } from '@inertiajs/react'
import { FormEvent } from 'react'

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    })

    function submit(e: FormEvent) {
        e.preventDefault()
        post('/login')
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
            <div style={{ width: 360, padding: 32, background: '#1e293b', borderRadius: 12 }}>
                <h1 style={{ color: '#f8fafc', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Vaultus</h1>
                <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>Acesse seu sistema</p>

                <form onSubmit={submit}>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', color: '#cbd5e1', fontSize: 14, marginBottom: 6 }}>Email</label>
                        <input
                            type="email"
                            value={data.email}
                            onChange={e => setData('email', e.target.value)}
                            required autoFocus
                            style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc', fontSize: 14, boxSizing: 'border-box' }}
                        />
                        {errors.email && <p style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>{errors.email}</p>}
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', color: '#cbd5e1', fontSize: 14, marginBottom: 6 }}>Senha</label>
                        <input
                            type="password"
                            value={data.password}
                            onChange={e => setData('password', e.target.value)}
                            required
                            style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc', fontSize: 14, boxSizing: 'border-box' }}
                        />
                        {errors.password && <p style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>{errors.password}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        style={{ width: '100%', padding: 12, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: processing ? 'not-allowed' : 'pointer', opacity: processing ? 0.7 : 1 }}
                    >
                        {processing ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>
            </div>
        </div>
    )
}
