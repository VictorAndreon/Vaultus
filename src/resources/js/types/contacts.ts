export interface UpcomingBirthday {
  date: string         // dd/mm
  days_away: number    // dias até a data
}

export interface Contact {
  id: number
  name: string
  initials: string
  email: string | null
  phone: string | null
  photo: string | null
  birthday: string | null
  context: string | null
  next_step: string | null
  last_contacted_at: string | null
  last_contacted_relative: string | null
  remind_after_days: number | null
  notes: string | null
  upcoming_birthday: UpcomingBirthday | null
}

export interface ContactsPageProps {
  contacts: Contact[]
}

export const CATEGORIES = ['Família', 'Trabalho', 'Saúde', 'Casa'] as const

export const CATEGORY_HUE: Record<string, number> = {
  'Família': 140,
  'Trabalho': 60,
  'Saúde': 230,
  'Casa': 320,
}
