<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Services\CreditCardStatement;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;

class StatementController extends Controller
{
    public function show(Request $request, Account $account, CreditCardStatement $service)
    {
        abort_if($account->user_id !== $request->user()->id, 403);
        abort_if($account->type !== 'credit', 422, 'Faturas só existem para contas de cartão de crédito.');
        abort_if(empty($account->closing_day) || empty($account->due_day), 422, 'Cadastre o dia de fechamento e vencimento da conta primeiro.');

        $tz  = $request->user()->timezone ?? 'America/Sao_Paulo';
        $now = Carbon::now($tz);

        $validated = $request->validate([
            'month' => 'nullable|date_format:Y-m',
        ]);

        $dueAnchor = isset($validated['month'])
            ? Carbon::createFromFormat('Y-m', $validated['month'], $tz)->day(min($account->due_day, 28))
            : $now->copy()->day(min($account->due_day, 28));

        return Inertia::render('Finance/Statement', [
            'account'   => [
                'id'          => $account->id,
                'name'        => $account->name,
                'closing_day' => $account->closing_day,
                'due_day'     => $account->due_day,
            ],
            'statement' => $service->forMonth($account, $dueAnchor),
            'month'     => $dueAnchor->format('Y-m'),
        ]);
    }
}
