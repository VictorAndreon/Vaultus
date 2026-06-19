import { useState } from 'react'

// Capa com fallback: cai no placeholder .ph se a imagem falhar (404 da rota local,
// arquivo sumido do disco, ou capa externa legada bloqueada pela CSP).
export default function CoverImg({ src, alt, w, h }: { src: string | null; alt: string; w: number; h: number }) {
    const [failed, setFailed] = useState(false)
    if (!src || failed) {
        return <div className="ph" style={{ width: w, height: h, flex: 'none', fontSize: 0 }} />
    }
    return (
        <img
            src={src}
            alt={alt}
            loading="lazy"
            onError={() => setFailed(true)}
            style={{ width: w, height: h, objectFit: 'cover', borderRadius: 'var(--r-2)', flex: 'none' }}
        />
    )
}
