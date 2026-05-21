<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Services\CreditCardStatement;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;

class CardsController extends Controller
{
    public function index(Request $request, CreditCardStatement $service)
    {
        $tz  = $request->user()->timezone ?? 'America/Sao_Paulo';
        $now = Carbon::now($tz);

        $cards = $request->user()->accounts()
            ->where('type', 'credit')
            ->with('transactions')
            ->get()
            ->map(fn (Account $card) => [
                'id'                => $card->id,
                'name'              => $card->name,
                'used'              => (float) $card->current_balance,
                'credit_limit'      => $card->credit_limit_encrypted !== null ? (float) $card->credit_limit_encrypted : null,
                'closing_day'       => $card->closing_day,
                'due_day'           => $card->due_day,
                'current_statement' => ($card->closing_day && $card->due_day)
                    ? $this->summarizeStatement($service, $card, $now)
                    : null,
            ])
            ->values()
            ->toArray();

        return Inertia::render('Finance/Cards', [
            'cards' => $cards,
        ]);
    }

    private function summarizeStatement(CreditCardStatement $service, Account $card, Carbon $now): array
    {
        $dueAnchor = $now->copy()->day(min($card->due_day, 28));
        $s = $service->forMonth($card, $dueAnchor);
        return [
            'period_start' => $s['period_start'],
            'period_end'   => $s['period_end'],
            'closes_at'    => $s['closes_at'],
            'due_at'       => $s['due_at'],
            'total'        => $s['total'],
            'paid'         => $s['paid'],
            'status'       => $s['status'],
        ];
    }
}
