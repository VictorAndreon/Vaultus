export type CheckState = 'filled' | 'failed' | 'neutral' | 'empty'

// type (não interface): ReviewContent é enviado como payload do router.patch e
// precisa ser atribuível a RequestPayload (FormDataConvertible) do Inertia —
// interfaces não casam com index signatures, type aliases sim.
export type ReviewItem = {
  text: string
  state?: CheckState
}

export type ReviewContent = {
  funcionou_bem: ReviewItem[]
  pode_melhorar: ReviewItem[]
  aprendizados: ReviewItem[]
  proxima_semana: ReviewItem[]
}

export interface Review {
  id: number
  type: 'weekly' | 'monthly' | 'quarterly' | 'annual'
  period_start: string         // dd/mm/yyyy
  period_start_iso: string     // yyyy-mm-dd
  period_end: string           // dd/mm/yyyy
  period_end_iso: string       // yyyy-mm-dd
  week_number: number
  year: number
  completion_pct: number
  content: ReviewContent
}

export interface ReviewsPageProps {
  reviews: Review[]
  current: Review | null
}
