import { useForm } from '@inertiajs/react'
import { FormEvent } from 'react'

export default function Register() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    })

    function submit(e: FormEvent) {
        e.preventDefault()
        post('/register')
    }

    const inputStyle = { width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc', fontSize: 14, boxSizing: 'border-box' as const }
    const labelStyle = { display: 'block', color: '#cbd5e1', fontSize: 14, marginBottom: 6 }
    const errorStyle = { color: '#f87171', fontSize: 12, marginTop: 4 }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
            <div style={{ width: 360, padding: 32, background: '#1e293b', borderRadius: 12 }}>
                <h1 style={{ color: '#f8fafc', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Vaultus</h1>
                <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>Crie sua conta de acesso</p>

                <form onSubmit={submit}>
                    <div style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>Nome</label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={e => setData('name', e.target.value)}
                            required autoFocus
                            style={inputStyle}
                        />
                        {errors.name && <p style={errorStyle}>{errors.name}</p>}
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>Email</label>
                        <input
                            type="email"
                            value={data.email}
                            onChange={e => setData('email', e.target.value)}
                            required
                            style={inputStyle}
                        />
                        {errors.email && <p style={errorStyle}>{errors.email}</p>}
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>Senha</label>
                        <input
                            type="password"
                            value={data.password}
                            onChange={e => setData('password', e.target.value)}
                            required
                            style={inputStyle}
                        />
                        {errors.password && <p style={errorStyle}>{errors.password}</p>}
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <label style={labelStyle}>Confirmar senha</label>
                        <input
                            type="password"
                            value={data.password_confirmation}
                            onChange={e => setData('password_confirmation', e.target.value)}
                            required
                            style={inputStyle}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        style={{ width: '100%', padding: 12, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: processing ? 'not-allowed' : 'pointer', opacity: processing ? 0.7 : 1 }}
                    >
                        {processing ? 'Criando...' : 'Criar conta'}
                    </button>
                </form>
            </div>
        </div>
    )
}
