<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\Transaction;
use App\Domains\Finance\Queries\TransactionFilters;
use App\Domains\Finance\Queries\TransactionListingQuery;
use App\Http\Resources\TransactionResource;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TransactionController extends Controller
{
    public function index(Request $request, TransactionListingQuery $query)
    {
        $user    = $request->user();
        $filters = TransactionFilters::fromRequest($request);

        $transactions = $query->paginate($user, $filters);

        $accounts = $user->accounts()->userVisible()->get(['id', 'name', 'type']);

        // through() preserva a estrutura plana do LengthAwarePaginator (last_page, next_page_url, etc.)
        // que o Inertia consome diretamente como props, em vez do wrapper {data, meta, links} de ::collection().
        $transactions->through(fn ($t) => (new TransactionResource($t))->resolve($request));

        return Inertia::render('Finance/Transactions', [
            'transactions' => $transactions,
            'filters'      => $filters->toArray(),
            'accounts'     => $accounts,
            'categories'   => $user->budgetCategories()->pluck('name')->values(),
        ]);
    }

    public function store(Request $request, Account $account)
    {
        abort_if($account->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'type'                   => 'required|in:income,expense,transfer',
            'amount'                 => 'sometimes|numeric|min:0.01',
            'amount_encrypted'       => 'sometimes|numeric|min:0.01',
            'description'            => 'required|string|max:255',
            'category'               => 'nullable|string|max:100',
            'occurred_at'            => 'required|date_format:Y-m-d',
            'transfer_to_account_id' => 'required_if:type,transfer|nullable|exists:accounts,id',
        ]);

        $amount = $validated['amount'] ?? $validated['amount_encrypted'] ?? null;
        abort_if($amount === null, 422, 'O campo valor é obrigatório.');
        $validated['amount_encrypted'] = $amount;
        unset($validated['amount']);

        $this->guardCreditLimit($account, $validated['type'], (float) $amount);

        if ($validated['type'] === 'transfer') {
            $this->createTransferPair($request->user(), $account, $validated);
        } else {
            $account->transactions()->create($validated);
        }

        return back();
    }

    /**
     * Cartões de crédito têm limite — uma despesa que ultrapasse o saldo devedor atual
     * + nova compra deve ser barrada. Para conta sem credit_limit cadastrado, o cartão é
     * tratado como ilimitado (decisão consciente; força o usuário a cadastrar o limite
     * se quiser proteção).
     */
    private function guardCreditLimit(Account $account, string $type, float $amount): void
    {
        if ($type !== 'expense' || $account->type !== 'credit') {
            return;
        }
        $limit = $account->credit_limit_encrypted !== null ? (float) $account->credit_limit_encrypted : null;
        if ($limit === null) {
            return;
        }

        $projected = (float) $account->current_balance + $amount;
        if ($projected > $limit) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'amount' => 'Compra ultrapassa o limite do cartão (disponível: R$ ' . number_format($limit - $account->current_balance, 2, ',', '.') . ').',
            ]);
        }
    }

    private function createTransferPair($user, Account $source, array $data): void
    {
        $destId = $data['transfer_to_account_id'];
        $dest   = Account::findOrFail($destId);

        abort_if($dest->user_id !== $user->id, 422, 'Conta destino não pertence ao usuário.');

        DB::transaction(function () use ($source, $dest, $destId, $data) {
            $shared = [
                'type'             => 'transfer',
                'amount_encrypted' => $data['amount_encrypted'],
                'description'      => $data['description'],
                'occurred_at'      => $data['occurred_at'],
                'category'         => null,
            ];

            $outgoing = $source->transactions()->create(array_merge($shared, [
                'transfer_to_account_id' => $destId,
            ]));

            $incoming = $dest->transactions()->create(array_merge($shared, [
                'transfer_pair_id' => $outgoing->id,
            ]));

            $outgoing->update(['transfer_pair_id' => $incoming->id]);
        });
    }

    public function update(Request $request, Transaction $transaction)
    {
        abort_if($transaction->account->user_id !== $request->user()->id, 403);
        // Transferências são pares atômicos — editar uma perna sem a outra corromperia
        // o saldo de duas contas. Para alterar, o cliente deve excluir e recriar.
        abort_if($transaction->type === 'transfer', 422, 'Transferências não podem ser editadas. Exclua e recrie.');

        $validated = $request->validate([
            'type'             => 'sometimes|in:income,expense',
            'amount'           => 'sometimes|numeric|min:0.01',
            'amount_encrypted' => 'sometimes|numeric|min:0.01',
            'description'      => 'sometimes|string|max:255',
            'category'         => 'nullable|string|max:100',
            'occurred_at'      => 'sometimes|date_format:Y-m-d',
        ]);

        if (array_key_exists('amount', $validated)) {
            $validated['amount_encrypted'] = $validated['amount'];
            unset($validated['amount']);
        }

        $transaction->update($validated);

        return back();
    }

    public function destroy(Request $request, Transaction $transaction)
    {
        abort_if($transaction->account->user_id !== $request->user()->id, 403);

        DB::transaction(function () use ($request, $transaction) {
            if ($transaction->transfer_pair_id) {
                $pair = Transaction::find($transaction->transfer_pair_id);
                if ($pair && $pair->account->user_id === $request->user()->id) {
                    $pair->delete();
                }
            }
            $transaction->delete();
        });

        return back();
    }
}
