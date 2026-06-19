import { router } from '@inertiajs/react'

type VisitOptions = Parameters<typeof router.post>[2]
type Payload = NonNullable<Parameters<typeof router.post>[1]>

/**
 * Wrapper sobre router.post que injeta um Idempotency-Key único por chamada.
 * Protege escritas contra clique-duplo / re-submit acidental — o middleware
 * EnsureIdempotent reconhece a chave e replica a resposta da primeira tentativa.
 */
export function idempotentPost(url: string, data: Record<string, unknown> = {}, options: VisitOptions = {}) {
  const key = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

  return router.post(url, data as Payload, {
    ...options,
    headers: { ...(options?.headers ?? {}), 'Idempotency-Key': key },
  })
}
