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
