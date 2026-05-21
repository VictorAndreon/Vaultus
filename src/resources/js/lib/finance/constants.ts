export const GOAL_ICON_KEYS = [
  'shield', 'home', 'plane', 'car', 'graduation', 'heart', 'briefcase',
  'smartphone', 'leaf', 'coin', 'wrench', 'gamepad', 'star', 'flag',
  'trend', 'finance',
] as const

export const GOAL_COLORS = [
  { label: 'Verde',   value: 'var(--green)' },
  { label: 'Dourado', value: 'var(--gold)' },
  { label: 'Azul',    value: 'var(--sky)' },
  { label: 'Rosa',    value: 'var(--rose)' },
  { label: 'Roxo',    value: 'var(--purple, oklch(72% 0.12 290))' },
  { label: 'Teal',    value: 'var(--teal, oklch(76% 0.12 195))' },
]

export const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  'no-prazo':  { label: 'No prazo',  cls: 'tag-green' },
  'atencao':   { label: 'Atenção',   cls: 'tag-gold'  },
  'atrasado':  { label: 'Atrasado',  cls: 'tag-rose'  },
  'concluida': { label: 'Concluída', cls: 'tag-sky'   },
}

export const ACCOUNT_TYPES = [
  { value: 'checking',   label: 'Conta Corrente', isLiability: false },
  { value: 'savings',    label: 'Poupança',       isLiability: false },
  { value: 'investment', label: 'Investimentos',  isLiability: false },
  { value: 'cash',       label: 'Dinheiro',       isLiability: false },
  { value: 'credit',     label: 'Cartão de Crédito',         isLiability: true  },
  { value: 'loan',       label: 'Financiamento / Empréstimo', isLiability: true  },
]

export const LIABILITY_TYPES = ['credit', 'loan']

export const DEADLINE_MONTHS = [
  { v: '01', l: 'Jan' }, { v: '02', l: 'Fev' }, { v: '03', l: 'Mar' },
  { v: '04', l: 'Abr' }, { v: '05', l: 'Mai' }, { v: '06', l: 'Jun' },
  { v: '07', l: 'Jul' }, { v: '08', l: 'Ago' }, { v: '09', l: 'Set' },
  { v: '10', l: 'Out' }, { v: '11', l: 'Nov' }, { v: '12', l: 'Dez' },
]
