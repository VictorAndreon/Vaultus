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
    color: string | null
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

export interface JournalEntry {
    id: number
    date: string
    title: string | null
    content: string
    tags: string[]
    health_metric_id: number | null
    mood: number | null
    energy: number | null
    preview: string | null
}

export interface JournalPrompt {
    id: number
    content: string
    is_active: boolean
    position: number
}

export interface Account {
    id: number
    name: string
    type: string
    currency: string
    current_balance: number
}

export interface Transaction {
    id: number
    account_id: number
    type: 'income' | 'expense'
    amount: number
    description: string
    category: string | null
    occurred_at: string
}

export interface FinancialGoal {
    id: number
    name: string
    target_amount: number
    current_amount: number
    progress_percent: number
    category: string | null
    deadline: string | null
    is_completed: boolean
    is_archived: boolean
}

export interface WishlistItem {
    id: number
    name: string
    estimated_price: number | null
    priority: 'low' | 'medium' | 'high'
    url: string | null
    notes: string | null
    financial_goal_id: number | null
    goal: FinancialGoal | null
}

export interface Want {
    id: number
    title: string
    description: string | null
    category: string | null
    priority: 'low' | 'medium' | 'high'
    promoted_at: string | null
}

export interface Project {
    id: number
    title: string
    description: string | null
    status: 'active' | 'paused' | 'done' | 'archived'
    want_id: number | null
    tasks_count?: number
    columns?: ProjectColumn[]
    notes?: ProjectNote[]
    links?: ProjectLink[]
}

export interface ProjectColumn {
    id: number
    name: string
    position: number
    tasks: ProjectTask[]
}

export interface ProjectTask {
    id: number
    project_column_id: number
    title: string
    description: string | null
    priority: 'low' | 'medium' | 'high' | 'urgent'
    position: number
    due_at: string | null
}

export interface ProjectNote {
    id: number
    content: string
    created_at: string
}

export interface ProjectLink {
    id: number
    title: string
    url: string
}
