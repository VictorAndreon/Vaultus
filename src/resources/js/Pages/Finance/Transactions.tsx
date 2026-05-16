import { useState } from 'react'
import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import TransactionFilters, { FilterState } from './components/TransactionFilters'
import TransactionsTable, { ListedTransaction } from './components/TransactionsTable'
import { useDebouncedEffect } from '@/lib/useDebouncedEffect'

interface AccountOption { id: number; name: string; type: string }

interface Props {
  transactions: {
    data: ListedTransaction[]
    current_page: number
    last_page: number
    per_page: number
    total: number
    next_page_url: string | null
    prev_page_url: string | null
  }
  filters: {
    types: string[]
    account_ids: number[]
    categories: string[]
    date_from: string | null
    date_to: string | null
    search: string | null
  }
  accounts: AccountOption[]
  categories: string[]
}

export default function TransactionsPage({ transactions, filters, accounts, categories }: Props) {
  const initial: FilterState = {
    types:      filters.types ?? [],
    accountIds: filters.account_ids ?? [],
    categories: filters.categories ?? [],
    dateFrom:   filters.date_from ?? '',
    dateTo:     filters.date_to ?? '',
    search:     filters.search ?? '',
  }

  const [state, setState] = useState<FilterState>(initial)

  useDebouncedEffect(() => {
    router.get('/finance/transactions', {
      types:        state.types.join(',') || undefined,
      account_ids:  state.accountIds.join(',') || undefined,
      categories:   state.categories.join(',') || undefined,
      date_from:    state.dateFrom || undefined,
      date_to:      state.dateTo || undefined,
      search:       state.search || undefined,
    }, {
      preserveScroll: true,
      preserveState:  true,
      replace:        true,
      only:           ['transactions', 'filters'],
    })
  }, [state.types, state.accountIds, state.categories, state.dateFrom, state.dateTo, state.search], 300)

  return (
    <AppLayout title="Lançamentos" eyebrow="Finanças" subtitle="Histórico completo com filtros e busca.">
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <TransactionFilters
          initial={state}
          accounts={accounts}
          categories={categories}
          onChange={setState}
        />
        <TransactionsTable transactions={transactions} />
      </div>
    </AppLayout>
  )
}
