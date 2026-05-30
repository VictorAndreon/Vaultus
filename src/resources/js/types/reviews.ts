export type CheckState = 'filled' | 'failed' | 'neutral' | 'empty'

export interface ReviewItem {
  text: string
  state?: CheckState
}

export interface ReviewContent {
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
