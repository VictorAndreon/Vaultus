export interface FinancialGoal {
  id: number
  name: string
  note: string | null
  icon: string
  color: string
  status: string
  target_amount: number
  current_amount: number
  monthly_amount: number
  suggested_monthly: number
  progress_percent: number
  deadline: string | null
  deadline_label: string | null
  months_left: number
  is_completed: boolean
  history: number[]
  category: string | null
}

export interface AccountItem {
  id: number
  name: string
  type: string
}

export interface BudgetEntry {
  id: number
  name: string
  color: string
  spent: number
  budget: number
  pct: number
}

export interface FinanceTransaction {
  id: number
  date: string
  description: string
  category: string
  method: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
}

export interface DonutSegment {
  label: string
  color: string
  amount: number
  pct: number
  is_liability?: boolean
}

export interface FlowChart {
  labels: string[]
  income: number[]
  expense: number[]
}

export interface UpcomingPayment {
  id: number
  description: string
  amount: number
  due_date: string
  due_label: string
  days_until: number
  tag: string | null
  linked_goal_id: number | null
}

export interface FinanceIndexProps {
  net_worth: number
  month_income: number
  month_expense: number
  savings_rate: number
  savings_goal_pct: number
  flow_chart: FlowChart
  donut: DonutSegment[]
  budgets: BudgetEntry[]
  transactions: FinanceTransaction[]
  goals: FinancialGoal[]
  month_label: string
  accounts_list: AccountItem[]
  upcoming_payments: UpcomingPayment[]
  budget_category_names: string[]
}
