export interface User {
    id: number
    name: string
    email: string
    two_factor_confirmed_at: string | null
}

export interface PageProps {
    auth: { user: User | null }
}
