<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Models\FinancialGoal;
use App\Domains\Finance\Models\Transaction;
use App\Domains\Finance\Models\TransactionGoal;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * @deprecated Substituído por GoalDepositService (aporte como transferência interna).
 *             Rotas correspondentes desativadas em routes/web.php. Mantido apenas
 *             para evitar erros caso algum job/queue legado faça referência.
 */
class TransactionGoalController extends Controller
{
    public function store(Request $request, Transaction $transaction)
    {
        abort_if($transaction->account->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'financial_goal_id' => 'required|exists:financial_goals,id',
            'amount_encrypted'  => 'required|numeric|min:0.01',
        ]);

        $goal = FinancialGoal::where('id', $validated['financial_goal_id'])
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $transaction->transactionGoals()->create([
            'financial_goal_id' => $goal->id,
            'amount_encrypted'  => $validated['amount_encrypted'],
        ]);

        return back();
    }

    public function destroy(Request $request, TransactionGoal $allocation)
    {
        abort_if($allocation->financialGoal->user_id !== $request->user()->id, 403);

        $allocation->delete();

        return back();
    }
}
