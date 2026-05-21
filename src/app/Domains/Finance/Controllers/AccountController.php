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

        return Inertia::render('Finance/Account', [
            'account'       => AccountResource::make($account->loadMissing('transactions')),
            'transactions'  => TransactionResource::collection($transactions),
            'month_income'  => $monthIncome,
            'month_expense' => $monthExpense,
            'month_count'   => $monthCount,
            'peak_balance'  => $peakBalance,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                   => 'required|string|max:255',
            'type'                   => 'required|in:checking,savings,investment,cash,credit,loan',
            'balance_encrypted'      => 'required|numeric',
            'currency'               => 'required|string|size:3',
            'credit_limit_encrypted' => 'nullable|numeric|min:0',
            'interest_rate'          => 'nullable|numeric|min:0|max:999',
        ]);

        // credit_limit e interest_rate só fazem sentido em contas de passivo (credit/loan).
        // Aceitar em outros tipos é silenciosamente errado — corrompe semântica e relatórios.
        if (! in_array($validated['type'], ['credit', 'loan'], true)) {
            abort_if(! empty($validated['credit_limit_encrypted']), 422, 'credit_limit só é aplicável a contas do tipo credit/loan.');
            abort_if(! empty($validated['interest_rate']),          422, 'interest_rate só é aplicável a contas do tipo credit/loan.');
        }

        $request->user()->accounts()->create($validated);

        return back();
    }

    public function update(Request $request, Account $account)
    {
        abort_if($account->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'name'              => 'sometimes|string|max:255',
            'currency'          => 'sometimes|string|size:3',
            'balance_encrypted' => 'sometimes|numeric',
        ]);

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
