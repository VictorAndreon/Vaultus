export interface User {
    id: number
    name: string
    email: string
    timezone: string
    two_factor_confirmed_at: string | null
}

export interface PageProps {
    auth: { user: User | null }
    flash?: { success?: string; error?: string }
}

export interface PaginatedResponse<T> {
    data: T[]
    current_page: number
    last_page: number
    per_page: number
    total: number
}

export type FrequencyType = 'daily' | 'weekly' | 'x_per_week'

export interface Habit {
    id: number
    name: string
    icon: string | null
    frequency_type: FrequencyType
    frequency_days: number[] | null    // 0=dom ... 6=sab
    frequency_times: number | null
    category: string | null
    current_streak: number
    best_streak: number
    is_active: boolean
    checked_in_today: boolean
    recent_check_ins: string[]         // array de 'YYYY-MM-DD'
    week_check_ins_count: number | null // só para x_per_week
}

export interface HealthMetric {
    id: number
    date: string
    mood: number | null
    energy: number | null
    sleep_hours: string | null
    water_liters: string | null
    weight_kg: string | null
    notes: string | null
}
