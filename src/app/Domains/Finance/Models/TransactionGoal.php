<?php

namespace App\Domains\Finance\Models;

use App\Shared\Casts\EncryptedCast;
use Illuminate\Database\Eloquent\Model;

/**
 * @deprecated Aportes de meta agora são modelados como transferências internas
 *             entre conta de origem e subconta virtual da meta (ver
 *             GoalDepositService + migration 2026_05_16_000002). Esta entidade
 *             permanece exclusivamente para leitura de histórico anterior à
 *             migração. Não criar novos registros aqui.
 */
class TransactionGoal extends Model
{
    protected $fillable = [
        'transaction_id', 'financial_goal_id', 'amount_encrypted', 'occurred_at', 'note',
    ];

    protected function casts(): array
    {
        return [
            'amount_encrypted' => EncryptedCast::class,
        ];
    }

    protected $table = 'transaction_goal';

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }

    public function financialGoal()
    {
        return $this->belongsTo(FinancialGoal::class);
    }
}
