<?php

namespace App\Domains\Finance\Observers;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Audit log de toda mutation em models financeiras (Account, Transaction, FinancialGoal,
 * BudgetCategory, UpcomingPayment). Persiste em audit_logs com schema:
 *   user_id | event | ip_address | user_agent | metadata (jsonb) | created_at
 *
 * Operações sem usuário autenticado (CLI, jobs, seeders, migrations) NÃO geram audit —
 * elas têm contexto próprio (logs estruturados, git history) e poluiriam o registro.
 */
class FinanceAuditObserver
{
    private function log(Model $model, string $action): void
    {
        $user = Auth::user();
        if (! $user) {
            return;
        }

        $request = request();

        DB::table('audit_logs')->insert([
            'user_id'    => $user->id,
            'event'      => sprintf('finance.%s.%s', $this->subjectKey($model), $action),
            'ip_address' => $request?->ip(),
            'user_agent' => substr((string) $request?->userAgent(), 0, 255) ?: null,
            'metadata'   => json_encode([
                'subject_type' => get_class($model),
                'subject_id'   => $model->getKey(),
                'attributes'   => $this->safeAttributes($model),
                'original'     => $action === 'updated' ? $model->getOriginal() : null,
                'changes'      => $action === 'updated' ? $model->getChanges() : null,
            ]),
            'created_at' => now(),
        ]);
    }

    private function subjectKey(Model $model): string
    {
        return match (get_class($model)) {
            \App\Domains\Finance\Models\Account::class         => 'account',
            \App\Domains\Finance\Models\Transaction::class     => 'transaction',
            \App\Domains\Finance\Models\FinancialGoal::class   => 'goal',
            \App\Domains\Finance\Models\TransactionGoal::class => 'goal_allocation',
            \App\Domains\Finance\Models\BudgetCategory::class  => 'budget_category',
            \App\Domains\Finance\Models\UpcomingPayment::class => 'upcoming_payment',
            default                                            => strtolower(class_basename($model)),
        };
    }

    /**
     * Não logamos os atributos crus que ainda contêm valor cifrado nem chaves serão úteis sem o cast.
     * Em casos sensíveis (futuro), aqui é o ponto de redação.
     */
    private function safeAttributes(Model $model): array
    {
        return $model->getAttributes();
    }

    public function created(Model $model): void  { $this->log($model, 'created'); }
    public function updated(Model $model): void  { $this->log($model, 'updated'); }
    public function deleted(Model $model): void  { $this->log($model, 'deleted'); }
    public function restored(Model $model): void { $this->log($model, 'restored'); }
}
