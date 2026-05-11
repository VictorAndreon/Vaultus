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

        $transactions = $account->transactions()->latest('occurred_at')->paginate(25);

        return Inertia::render('Finance/Account', [
            'account'      => AccountResource::make($account->loadMissing('transactions')),
            'transactions' => TransactionResource::collection($transactions),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'              => 'required|string|max:255',
            'type'              => 'required|in:checking,savings,investment,cash',
            'balance_encrypted' => 'required|numeric',
            'currency'          => 'required|string|size:3',
        ]);

        $request->user()->accounts()->create($validated);

        return back();
    }

    public function update(Request $request, Account $account)
    {
        abort_if($account->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'name'     => 'sometimes|string|max:255',
            'currency' => 'sometimes|string|size:3',
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
