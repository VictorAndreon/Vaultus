<?php

namespace App\Domains\Finance\Queries;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Transaction;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class TransactionListingQuery
{
    public function paginate(User $user, TransactionFilters $f, int $perPage = 25): LengthAwarePaginator
    {
        return Transaction::query()
            ->whereHas('account', fn ($q) => $q->where('user_id', $user->id))
            ->when($f->types,      fn ($q, $types) => $q->whereIn('type', $types))
            ->when($f->accountIds, fn ($q, $ids)   => $q->whereIn('account_id', $ids))
            ->when($f->categories, fn ($q, $cats)  => $q->whereIn('category', $cats))
            ->when($f->dateFrom,   fn ($q, $d)     => $q->where('occurred_at', '>=', $d))
            ->when($f->dateTo,     fn ($q, $d)     => $q->where('occurred_at', '<=', $d))
            ->when($f->search,     fn ($q, $s)     => $q->where('description', 'ilike', "%{$s}%"))
            ->with(['account:id,name,type'])
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();
    }
}
