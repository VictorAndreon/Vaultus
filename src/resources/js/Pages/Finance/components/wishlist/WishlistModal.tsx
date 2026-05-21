import { useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import { Icons } from '@/Components/Icons'
import CurrencyInput from '@/Components/CurrencyInput'
import { FinancialGoal, WishlistItem } from '@/types/finance'
import { idempotentPost } from '@/lib/idempotentPost'

interface Props {
  item: WishlistItem | null
  goals: FinancialGoal[]
  onClose: () => void
}

type Priority = 'low' | 'medium' | 'high'

const PRIORITY_OPTIONS: { value: Priority; label: string; cls: string }[] = [
  { value: 'low',    label: 'Baixa',  cls: 'tag' },
  { value: 'medium', label: 'Média',  cls: 'tag tag-gold' },
  { value: 'high',   label: 'Alta',   cls: 'tag tag-rose' },
]

export default function WishlistModal({ item, goals, onClose }: Props) {
  const errors = usePage().props.errors as Record<string, string> | undefined
  const isEdit = !!item
  const [name, setName] = useState(item?.name ?? '')
  const [price, setPrice] = useState<number>(item?.estimated_price ?? 0)
  const [priority, setPriority] = useState<Priority>((item?.priority as Priority) ?? 'medium')
  const [url, setUrl] = useState(item?.url ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [goalId, setGoalId] = useState<number | ''>(item?.financial_goal_id ?? '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      name,
      estimated_price_encrypted: price > 0 ? price : null,
      priority,
      url: url || null,
      notes: notes || null,
      financial_goal_id: goalId === '' ? null : Number(goalId),
    }
    const opts = { preserveScroll: true, onSuccess: onClose }
    if (isEdit) router.patch(`/finance/wishlist/${item!.id}`, payload, opts)
    else        idempotentPost('/finance/wishlist', payload, opts)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-5)', width: '100%', maxWidth: 460, maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-2)' }}>
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="kicker">Desejos · {isEdit ? 'Editar item' : 'Novo item'}</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', marginTop: 6 }}>{isEdit ? item!.name : 'Adicionar item'}</div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ width: 26, height: 26, border: 'none' }}><Icons.X size={13} /></button>
        </div>

        <form onSubmit={submit} style={{ padding: '20px 26px' }}>
          <div style={{ marginBottom: 14 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Item</label>
            <input className="input" style={{ width: '100%' }} value={name} onChange={e => setName(e.target.value)} required autoFocus placeholder="Ex: MacBook Air" />
            {errors?.name && <div style={{ color: 'var(--rose)', fontSize: 12, marginTop: 4 }}>{errors.name}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Preço estimado (R$)</label>
              <CurrencyInput className="input" style={{ width: '100%' }} value={price} onValueChange={setPrice} />
            </div>
            <div>
              <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Prioridade</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {PRIORITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value)}
                    style={{
                      flex: 1, padding: '8px 6px', borderRadius: 8,
                      border: `1px solid ${priority === opt.value ? 'color-mix(in oklab, var(--green) 50%, transparent)' : 'var(--line)'}`,
                      background: priority === opt.value ? 'color-mix(in oklab, var(--green) 10%, transparent)' : 'var(--surface-2)',
                      color: priority === opt.value ? 'var(--text)' : 'var(--text-3)',
                      fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Link (opcional)</label>
            <input className="input" style={{ width: '100%' }} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
            {errors?.url && <div style={{ color: 'var(--rose)', fontSize: 12, marginTop: 4 }}>{errors.url}</div>}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Meta associada (opcional)</label>
            <select className="input" style={{ width: '100%' }} value={goalId} onChange={e => setGoalId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">Sem vínculo</option>
              {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            {errors?.financial_goal_id && <div style={{ color: 'var(--rose)', fontSize: 12, marginTop: 4 }}>{errors.financial_goal_id}</div>}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="kicker" style={{ display: 'block', marginBottom: 6 }}>Notas (opcional)</label>
            <textarea className="input" rows={3} style={{ width: '100%', resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detalhes, justificativa, modelo..." />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm"><Icons.Check size={13} /> Salvar</button>
          </div>
        </form>
      </div>
    </div>
  )
}
