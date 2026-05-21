<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Models\InstallmentPlan;
use App\Domains\Finance\Services\InstallmentPlanCreator;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class InstallmentPlanController extends Controller
{
    public function store(Request $request, InstallmentPlanCreator $creator)
    {
        $userId = $request->user()->id;
        $validated = $request->validate([
            'account_id'   => ['required', Rule::exists('accounts', 'id')->where('user_id', $userId)],
            'description'  => 'required|string|max:255',
            'total_amount' => 'required|numeric|min:0.01',
            'installments' => 'required|integer|min:2|max:99',
            'first_due_on' => 'required|date_format:Y-m-d',
            'category'     => 'nullable|string|max:100',
        ]);

        $creator->create($request->user(), $validated);

        return back();
    }

    /**
     * Remove o plano e suas parcelas FUTURAS (occurred_at > hoje). Parcelas já vencidas
     * são preservadas — elas representam dívidas reais que precisam continuar refletindo
     * no saldo do cartão.
     */
    public function destroy(Request $request, InstallmentPlan $plan)
    {
        abort_if($plan->user_id !== $request->user()->id, 403);

        $today = Carbon::today($request->user()->timezone ?? 'America/Sao_Paulo')->toDateString();

        DB::transaction(function () use ($plan, $today) {
            $plan->transactions()->where('occurred_at', '>', $today)->delete();
            $plan->delete();
        });

        return back();
    }
}
