<?php

namespace App\Domains\Finance\Models;

use App\Domains\Auth\Models\User;
use App\Shared\Casts\EncryptedCast;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RecurringRule extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id', 'account_id', 'type', 'amount_encrypted', 'description',
        'category', 'day_of_month', 'starts_on', 'ends_on', 'last_run_on', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'amount_encrypted' => EncryptedCast::class,
            'starts_on'        => 'date',
            'ends_on'          => 'date',
            'last_run_on'      => 'date',
            'is_active'        => 'boolean',
            'day_of_month'     => 'integer',
        ];
    }

    public function user()    { return $this->belongsTo(User::class); }
    public function account() { return $this->belongsTo(Account::class); }

    /**
     * Calcula a data efetiva do mês informado, considerando meses curtos
     * (dia 31 em fevereiro vira último dia disponível).
     */
    public function effectiveDateForMonth(CarbonInterface $monthAnchor): Carbon
    {
        $monthStart = $monthAnchor->copy()->startOfMonth();
        $day        = min($this->day_of_month, $monthStart->daysInMonth);
        return $monthStart->copy()->day($day);
    }
}
