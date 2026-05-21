<?php

namespace App\Domains\Finance\Services;

use App\Domains\Finance\Models\Account;
use Carbon\Carbon;
use Carbon\CarbonInterface;

/**
 * Constrói a fatura de um cartão de crédito para um ciclo (mês de vencimento).
 *
 * Modelagem do ciclo:
 *   - closing_day: dia em que a fatura "fecha" (corta novas compras)
 *   - due_day:     dia de vencimento (pagamento)
 *   - "Fatura do mês M" = transações de [closing_day+1 de M-1] até [closing_day de M],
 *     com vencimento em [due_day de M].
 *
 * Status:
 *   - paga    → soma de transferências para o cartão no período >= total
 *   - aberta  → hoje < data de fechamento da fatura
 *   - fechada → entre fechamento e vencimento, ainda não paga
 *   - atrasada → após vencimento, ainda não paga
 */
class CreditCardStatement
{
    /**
     * @return array{
     *   account_id:int, account_name:string,
     *   period_start:string, period_end:string,
     *   closes_at:string, due_at:string,
     *   total:float, paid:float, status:string,
     *   transactions: array<int, array{id:int, occurred_at:string, description:string, category:?string, amount:float}>
     * }
     */
    public function forMonth(Account $card, CarbonInterface $dueAnchor): array
    {
        $tz = $card->user->timezone ?? 'America/Sao_Paulo';

        $closingDay = $card->closing_day ?? 1;
        $dueDay     = $card->due_day     ?? $closingDay;

        $dueMonth      = $dueAnchor->copy()->setTimezone($tz)->startOfMonth();
        $closesAt      = $dueMonth->copy()->day(min($closingDay, $dueMonth->daysInMonth));
        $dueAt         = $dueMonth->copy()->day(min($dueDay, $dueMonth->daysInMonth));
        $prevMonth     = $dueMonth->copy()->subMonth();
        $periodStart   = $prevMonth->copy()->day(min($closingDay, $prevMonth->daysInMonth))->addDay();

        $txs = $card->transactions()
            ->whereBetween('occurred_at', [$periodStart->toDateString(), $closesAt->toDateString()])
            ->orderBy('occurred_at')
            ->get();

        $expenses = $txs->where('type', 'expense');
        $total    = (float) round((float) $expenses->sum(fn ($t) => (float) $t->amount_encrypted), 2);

        // Pagamentos = transferências recebidas no cartão (transfer com transfer_pair_id e sem transfer_to_account_id)
        // dentro de [periodStart, dueAt]. Janela inclui o pagamento que vence até o due_day.
        $paid = (float) round(
            (float) $card->transactions()
                ->where('type', 'transfer')
                ->whereNull('transfer_to_account_id')
                ->whereNotNull('transfer_pair_id')
                ->whereBetween('occurred_at', [$periodStart->toDateString(), $dueAt->toDateString()])
                ->get()
                ->sum(fn ($t) => (float) $t->amount_encrypted),
            2
        );

        $today  = Carbon::now($tz)->startOfDay();
        $status = $this->resolveStatus($today, $closesAt, $dueAt, $total, $paid);

        return [
            'account_id'   => $card->id,
            'account_name' => $card->name,
            'period_start' => $periodStart->toDateString(),
            'period_end'   => $closesAt->toDateString(),
            'closes_at'    => $closesAt->toDateString(),
            'due_at'       => $dueAt->toDateString(),
            'total'        => $total,
            'paid'         => $paid,
            'status'       => $status,
            'transactions' => $expenses->map(fn ($t) => [
                'id'          => $t->id,
                'occurred_at' => Carbon::parse($t->occurred_at)->toDateString(),
                'description' => $t->description,
                'category'    => $t->category,
                'amount'      => (float) $t->amount_encrypted,
            ])->values()->toArray(),
        ];
    }

    private function resolveStatus(CarbonInterface $today, CarbonInterface $closesAt, CarbonInterface $dueAt, float $total, float $paid): string
    {
        if ($total > 0 && $paid + 0.005 >= $total) {
            return 'paga';
        }
        if ($today->lt($closesAt)) {
            return 'aberta';
        }
        if ($today->lte($dueAt)) {
            return 'fechada';
        }
        return 'atrasada';
    }
}
