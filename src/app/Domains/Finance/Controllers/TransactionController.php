<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class TransactionController extends Controller
{
    public function store(Request $request, Account $account)
    {
        abort_if($account->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'type'             => 'required|in:income,expense',
            'amount_encrypted' => 'required|numeric|min:0.01',
            'description'      => 'required|string|max:255',
            'category'         => 'nullable|string|max:100',
            'occurred_at'      => 'required|date_format:Y-m-d',
        ]);

        $account->transactions()->create($validated);

        return back();
    }

    public function update(Request $request, Transaction $transaction)
    {
        abort_if($transaction->account->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'type'             => 'sometimes|in:income,expense',
            'amount_encrypted' => 'sometimes|numeric|min:0.01',
            'description'      => 'sometimes|string|max:255',
            'category'         => 'nullable|string|max:100',
            'occurred_at'      => 'sometimes|date_format:Y-m-d',
        ]);

        $transaction->update($validated);

        return back();
    }

    public function destroy(Request $request, Transaction $transaction)
    {
        abort_if($transaction->account->user_id !== $request->user()->id, 403);

        $transaction->delete();

        return back();
    }
}
