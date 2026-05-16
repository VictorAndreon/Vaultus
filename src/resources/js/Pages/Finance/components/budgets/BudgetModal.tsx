import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Icons } from '@/Components/Icons'
import CurrencyInput from '@/Components/CurrencyInput'
import { BudgetEntry } from '@/types/finance'

interface BudgetDraft { id?: number; name: string; budget: number; color: string }

const BUDGET_COLORS = ['var(--green)','var(--gold)','var(--sky)','var(--purple, oklch(72% 0.12 290))','var(--pink, oklch(74% 0.14 340))','var(--teal, oklch(76% 0.12 195))']

interface Props {
  budgets: BudgetEntry[]
  onClose: () => void
}

export default function BudgetModal({ budgets, onClose }: Props) {
  const [drafts, setDrafts] = useState<BudgetDraft[]>(
    budgets.map(b => ({ id: b.id, name: b.name, budget: b.budget, color: b.color }))
  )
  const [newName, setNewName] = useState('')
  const [newBudget, setNewBudget] = useState(0)
  const [newColor, setNewColor] = useState(BUDGET_COLORS[0])

  function updateDraft(i: number, field: keyof BudgetDraft, value: string | number) {
    setDrafts(d => d.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }
  function removeDraft(i: number) {
    setDrafts(d => d.filter((_, idx) => idx !== i))
  }
  function addCategory() {
    if (!newName.trim()) return
    setDrafts(d => [...d, { name: newName.trim(), budget: newBudget, color: newColor }])
    setNewName(''); setNewBudget(0)
  }
  function save() {
    router.put('/finance/budget-categories/batch', { categories: drafts }, {
      preserveScroll: true, onSuccess: onClose,
    })
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-5)', width: '100%', maxWidth: 480, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-2)' }}>
        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div className="kicker">Finanças · Orçamentos</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', marginTop: 6 }}>Ajustar orçamentos</div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ width: 26, height: 26, border: 'none' }}><Icons.X size={13} /></button>
        </div>

        <div style={{ padding: '16px 26px', overflowY: 'auto', flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 14, lineHeight: 1.5 }}>
            O gasto de cada categoria é calculado automaticamente a partir das transações do mês. Defina um limite mensal para acompanhar o uso.
          </div>
          {drafts.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flex: 'none' }} />
              <input className="input" style={{ flex: 1 }} value={d.name} onChange={e => updateDraft(i, 'name', e.target.value)} />
              <CurrencyInput className="input" style={{ width: 130 }} value={d.budget} onValueChange={v => updateDraft(i, 'budget', v)} />
              <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--rose)', padding: '5px 8px' }} onClick={() => removeDraft(i)}><Icons.X size={12} /></button>
            </div>
          ))}

          <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14, marginTop: 4 }}>
            <div className="kicker" style={{ marginBottom: 10 }}>Nova categoria</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              {BUDGET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setNewColor(c)}
                  style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: newColor === c ? '2px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" style={{ flex: 1 }} placeholder="Nome" value={newName} onChange={e => setNewName(e.target.value)} />
              <CurrencyInput className="input" style={{ width: 110 }} value={newBudget} onValueChange={v => setNewBudget(v)} placeholder="Limite R$" />
              <button type="button" className="btn btn-ghost btn-sm" onClick={addCategory}><Icons.Plus size={13} /></button>
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 26px', borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={save}><Icons.Check size={13} /> Salvar</button>
        </div>
      </div>
    </div>
  )
}
