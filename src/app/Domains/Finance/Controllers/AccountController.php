<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Models\Account;
use App\Http\Resources\AccountResource;
use App\Http\Resources\TransactionResource;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;

class AccountController extends Controller
{
    public function show(Request $request, Account $account)
    {
        abort_if($account->user_id !== $request->user()->id, 403);

        $now        = \Carbon\Carbon::now($request->user()->timezone ?? 'America/Sao_Paulo');
        $monthStart = $now->copy()->startOfMonth()->toDateString();
        $monthEnd   = $now->copy()->endOfMonth()->toDateString();

        $transactions = $account->transactions()->latest('occurred_at')->paginate(25);

        $allTx      = $account->transactions()->get();
        $monthTx    = $allTx->filter(function ($t) use ($monthStart, $monthEnd) {
            $date = \Carbon\Carbon::parse($t->occurred_at)->toDateString();
            return $date >= $monthStart && $date <= $monthEnd;
        });

        $monthIncome  = (float) $monthTx->where('type', 'income')->sum(fn($t) => (float) $t->amount_encrypted);
        $monthExpense = (float) $monthTx->where('type', 'expense')->sum(fn($t) => (float) $t->amount_encrypted);
        $monthCount   = $monthTx->count();

        $currentBalance = (float) $account->current_balance;
        $peakBalance    = $currentBalance * 1.2; // fallback conservador

        $user = $request->user();
        $accountsList = $user->accounts()->userVisible()->get(['id', 'name', 'type'])
            ->map(fn ($a) => ['id' => $a->id, 'name' => $a->name, 'type' => $a->type])
            ->values()->toArray();
        $budgetCategoryNames = $user->budgetCategories()->pluck('name')->values()->toArray();

        return Inertia::render('Finance/Account', [
            'account'               => AccountResource::make($account->loadMissing('transactions')),
            'transactions'          => TransactionResource::collection($transactions),
            'month_income'          => $monthIncome,
            'month_expense'         => $monthExpense,
            'month_count'           => $monthCount,
            'peak_balance'          => $peakBalance,
            'accounts_list'         => $accountsList,
            'budget_category_names' => $budgetCategoryNames,
        ]);
    }

    public function store(Request $request)
    {
        // Aceitamos nomes limpos (balance/credit_limit) E os legados *_encrypted durante a transição.
        // required_without garante que ao menos um esteja presente, e o erro de validação
        // aponta para o nome novo (balance), que tem `attributes` em pt-BR -> "saldo".
        $validated = $request->validate([
            'name'                   => 'required|string|max:255',
            'type'                   => 'required|in:checking,savings,investment,cash,credit,loan',
            'balance'                => 'required_without:balance_encrypted|numeric',
            'balance_encrypted'      => 'required_without:balance|numeric',
            'currency'               => 'required|string|size:3',
            'credit_limit'           => 'sometimes|numeric|min:0',
            'credit_limit_encrypted' => 'sometimes|numeric|min:0',
            'interest_rate'          => 'nullable|numeric|min:0|max:999',
            'closing_day'            => 'nullable|integer|min:1|max:31',
            'due_day'                => 'nullable|integer|min:1|max:31',
        ]);

        $balance     = $validated['balance']      ?? $validated['balance_encrypted']      ?? null;
        $creditLimit = $validated['credit_limit'] ?? $validated['credit_limit_encrypted'] ?? null;

        if (! in_array($validated['type'], ['credit', 'loan'], true)) {
            abort_if(! empty($creditLimit),                422, 'credit_limit só é aplicável a contas do tipo credit/loan.');
            abort_if(! empty($validated['interest_rate']), 422, 'interest_rate só é aplicável a contas do tipo credit/loan.');
            abort_if(! empty($validated['closing_day']),   422, 'closing_day só é aplicável a contas do tipo credit.');
            abort_if(! empty($validated['due_day']),       422, 'due_day só é aplicável a contas do tipo credit.');
        }

        $request->user()->accounts()->create([
            'name'                   => $validated['name'],
            'type'                   => $validated['type'],
            'currency'               => $validated['currency'],
            'balance_encrypted'      => $balance,
            'credit_limit_encrypted' => $creditLimit,
            'interest_rate'          => $validated['interest_rate'] ?? null,
            'closing_day'            => $validated['closing_day']   ?? null,
            'due_day'                => $validated['due_day']       ?? null,
        ]);

        return back();
    }

    public function update(Request $request, Account $account)
    {
        abort_if($account->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'name'              => 'sometimes|string|max:255',
            'currency'          => 'sometimes|string|size:3',
            'balance'           => 'sometimes|numeric',
            'balance_encrypted' => 'sometimes|numeric',
        ]);

        if (array_key_exists('balance', $validated)) {
            $validated['balance_encrypted'] = $validated['balance'];
            unset($validated['balance']);
        }

        $account->update($validated);

        return back();
    }

    public function destroy(Request $request, Account $account)
    {
        abort_if($account->user_id !== $request->user()->id, 403);

        $account->delete();

        return back();
    }
}
