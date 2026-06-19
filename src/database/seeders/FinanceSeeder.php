<?php

namespace Database\Seeders;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\BudgetCategory;
use App\Domains\Finance\Models\FinancialGoal;
use App\Domains\Finance\Models\InstallmentPlan;
use App\Domains\Finance\Models\RecurringRule;
use App\Domains\Finance\Models\Transaction;
use App\Domains\Finance\Models\UpcomingPayment;
use App\Domains\Finance\Models\WishlistItem;
use App\Domains\Finance\Services\GoalDepositService;
use App\Domains\Finance\Services\InstallmentPlanCreator;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Segue o fluxo real do domínio: valores sempre pelos casts *_encrypted;
 * aportes a metas via GoalDepositService (par de transferências p/ a subconta
 * virtual criada pelo hook de FinancialGoal); parcelamento via
 * InstallmentPlanCreator (valida limite e materializa as parcelas).
 */
class FinanceSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();
        if (! $user) {
            return;
        }

        $tz    = $user->timezone ?? 'America/Sao_Paulo';
        $today = Carbon::today($tz);

        $this->cleanup($user);

        // ---- Contas ----
        $corrente = $user->accounts()->create([
            'name' => 'Conta Corrente', 'type' => 'checking',
            'balance_encrypted' => 4200, 'currency' => 'BRL',
        ]);
        $user->accounts()->create([
            'name' => 'Poupança', 'type' => 'savings',
            'balance_encrypted' => 12000, 'currency' => 'BRL',
        ]);
        $user->accounts()->create([
            'name' => 'Investimentos', 'type' => 'investment',
            'balance_encrypted' => 38500, 'currency' => 'BRL',
        ]);
        $cartao = $user->accounts()->create([
            'name' => 'Cartão de Crédito', 'type' => 'credit',
            'balance_encrypted' => 0, 'currency' => 'BRL',
            'credit_limit_encrypted' => 8000, 'closing_day' => 28, 'due_day' => 7,
        ]);

        // ---- Orçamento por categoria ----
        $budget = [
            ['Moradia', 2500, 'var(--green)'], ['Mercado', 1200, 'var(--gold)'],
            ['Transporte', 400, 'var(--sky)'], ['Lazer', 500, 'var(--rose)'],
            ['Assinaturas', 150, 'var(--text-3)'],
        ];
        foreach ($budget as $i => [$name, $amount, $color]) {
            BudgetCategory::create([
                'user_id' => $user->id, 'name' => $name,
                'budget_amount_encrypted' => $amount, 'color' => $color, 'position' => $i,
            ]);
        }

        // ---- Histórico de 6 meses (datas futuras do mês atual são puladas) ----
        $mercado = [820, 905, 760, 880, 940, 810]; // variação mês a mês

        $tx = function (Account $acc, string $type, float $amount, string $desc, ?string $cat, Carbon $date) use ($today) {
            if ($date->gt($today)) {
                return; // mês corrente: não criar lançamentos no futuro
            }
            $acc->transactions()->create([
                'type' => $type, 'amount_encrypted' => $amount, 'description' => $desc,
                'category' => $cat, 'occurred_at' => $date->toDateString(),
            ]);
        };

        // Par de transferências, mesma convenção do GoalDepositService:
        // origem carrega transfer_to_account_id; destino carrega transfer_pair_id.
        $transfer = function (Account $from, Account $to, float $amount, string $desc, Carbon $date) use ($today) {
            if ($date->gt($today)) {
                return;
            }
            $shared = [
                'type' => 'transfer', 'amount_encrypted' => $amount,
                'description' => $desc, 'occurred_at' => $date->toDateString(), 'category' => null,
            ];
            $out = $from->transactions()->create($shared + ['transfer_to_account_id' => $to->id]);
            $in  = $to->transactions()->create($shared + ['transfer_pair_id' => $out->id]);
            $out->update(['transfer_pair_id' => $in->id]);
        };

        for ($m = 5; $m >= 0; $m--) {
            $month = $today->copy()->subMonthsNoOverflow($m)->startOfMonth();
            $day   = fn(int $d) => $month->copy()->day(min($d, $month->daysInMonth));

            $tx($corrente, 'income', 8500, 'Salário', 'Salário', $day(5));
            $tx($corrente, 'expense', 2200, 'Aluguel', 'Moradia', $day(10));
            $tx($corrente, 'expense', 180, 'Conta de energia', 'Moradia', $day(12));
            $tx($corrente, 'expense', $mercado[$m], 'Mercado do mês', 'Mercado', $day(16));
            $tx($corrente, 'expense', 89.90, 'Streaming + música', 'Assinaturas', $day(15));
            $tx($corrente, 'expense', 240, 'Combustível e apps', 'Transporte', $day(18));
            $tx($corrente, 'expense', 320, 'Jantar fora + cinema', 'Lazer', $day(21));

            $tx($cartao, 'expense', 180, 'Restaurante', 'Lazer', $day(8));
            $tx($cartao, 'expense', 95, 'Farmácia', 'Saúde', $day(14));
            $tx($cartao, 'expense', 260, 'Roupas', 'Pessoal', $day(20));

            // Pagamento da fatura — transferência corrente → cartão abate o passivo.
            $transfer($corrente, $cartao, 535, 'Pagamento fatura cartão', $day(25));
        }

        // ---- Recorrências (materializadas acima; last_run_on evita re-execução) ----
        $rules = [
            ['type' => 'income',  'amount' => 8500,  'desc' => 'Salário',           'cat' => 'Salário',     'day' => 5],
            ['type' => 'expense', 'amount' => 2200,  'desc' => 'Aluguel',           'cat' => 'Moradia',     'day' => 10],
            ['type' => 'expense', 'amount' => 89.90, 'desc' => 'Streaming + música', 'cat' => 'Assinaturas', 'day' => 15],
        ];
        foreach ($rules as $r) {
            $lastRun = $today->copy()->day(min($r['day'], $today->daysInMonth));
            if ($lastRun->gt($today)) {
                $lastRun->subMonthsNoOverflow(1);
            }
            RecurringRule::create([
                'user_id' => $user->id, 'account_id' => $corrente->id,
                'type' => $r['type'], 'amount_encrypted' => $r['amount'],
                'description' => $r['desc'], 'category' => $r['cat'],
                'day_of_month' => $r['day'],
                'starts_on' => $today->copy()->subMonthsNoOverflow(5)->startOfMonth()->toDateString(),
                'last_run_on' => $lastRun->toDateString(), 'is_active' => true,
            ]);
        }

        // ---- Metas (hook created cria a subconta virtual) + aportes via serviço ----
        $reserva = FinancialGoal::create([
            'user_id' => $user->id, 'name' => 'Reserva de Emergência', 'category' => 'Segurança',
            'target_amount_encrypted' => 30000, 'monthly_amount_encrypted' => 1000,
            'deadline' => $today->copy()->addMonths(18)->endOfMonth()->toDateString(),
        ]);
        $japao = FinancialGoal::create([
            'user_id' => $user->id, 'name' => 'Viagem ao Japão', 'category' => 'Experiência',
            'target_amount_encrypted' => 18000, 'monthly_amount_encrypted' => 800,
            'deadline' => $today->copy()->addMonths(12)->endOfMonth()->toDateString(),
        ]);
        $ape = FinancialGoal::create([
            'user_id' => $user->id, 'name' => 'Entrada do Apartamento', 'category' => 'Patrimônio',
            'target_amount_encrypted' => 80000, 'monthly_amount_encrypted' => 1500,
            'deadline' => $today->copy()->addMonths(36)->endOfMonth()->toDateString(),
        ]);

        $deposits = app(GoalDepositService::class);
        for ($m = 3; $m >= 0; $m--) {
            $date = $today->copy()->subMonthsNoOverflow($m)->startOfMonth()->day(6);
            if ($date->gt($today)) {
                continue;
            }
            $deposits->deposit($reserva, $corrente, 1000, $date->toDateString(), 'Aporte mensal');
            $deposits->deposit($japao, $corrente, 800, $date->toDateString(), 'Aporte mensal');
            $deposits->deposit($ape, $corrente, 1500, $date->toDateString(), 'Aporte mensal');
        }

        // ---- Parcelamento no cartão (materializa as 10 parcelas) ----
        app(InstallmentPlanCreator::class)->create($user, [
            'account_id'   => $cartao->id,
            'description'  => 'Notebook Dell',
            'total_amount' => 4800,
            'installments' => 10,
            'first_due_on' => $today->copy()->subMonthsNoOverflow(3)->startOfMonth()->day(10)->toDateString(),
            'category'     => 'Tecnologia',
        ]);

        // ---- Wishlist e pagamentos futuros ----
        WishlistItem::create([
            'user_id' => $user->id, 'name' => 'Cadeira ergonômica',
            'estimated_price_encrypted' => 2400, 'priority' => 'high',
            'notes' => 'Esperar promoção de meio de ano.',
        ]);
        WishlistItem::create([
            'user_id' => $user->id, 'financial_goal_id' => $japao->id, 'name' => 'Mala de viagem grande',
            'estimated_price_encrypted' => 900, 'priority' => 'medium',
        ]);

        UpcomingPayment::create([
            'user_id' => $user->id, 'description' => 'Condomínio',
            'amount_encrypted' => 650, 'due_date' => $today->copy()->addDays(5)->toDateString(), 'tag' => 'Moradia',
        ]);
        UpcomingPayment::create([
            'user_id' => $user->id, 'description' => 'IPVA — 2ª parcela',
            'amount_encrypted' => 480, 'due_date' => $today->copy()->addDays(12)->toDateString(), 'tag' => 'Imposto',
        ]);
        UpcomingPayment::create([
            'user_id' => $user->id, 'description' => 'Seguro do carro',
            'amount_encrypted' => 320, 'due_date' => $today->copy()->addDays(20)->toDateString(), 'tag' => 'Carro',
        ]);
    }

    /** Idempotente: zera o domínio Finance do usuário (inclui subcontas virtuais). */
    private function cleanup(User $user): void
    {
        $accountIds = Account::withTrashed()->where('user_id', $user->id)->pluck('id');

        Transaction::withTrashed()->whereIn('account_id', $accountIds)->forceDelete();
        InstallmentPlan::withTrashed()->where('user_id', $user->id)->forceDelete();
        RecurringRule::withTrashed()->where('user_id', $user->id)->forceDelete();
        WishlistItem::withTrashed()->where('user_id', $user->id)->forceDelete();
        UpcomingPayment::where('user_id', $user->id)->delete();
        BudgetCategory::where('user_id', $user->id)->delete();
        FinancialGoal::withTrashed()->where('user_id', $user->id)->forceDelete();
        Account::withTrashed()->whereIn('id', $accountIds)->forceDelete();
    }
}
