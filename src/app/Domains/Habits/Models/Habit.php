<?php

namespace App\Domains\Habits\Models;

use App\Domains\Auth\Models\User;
use Carbon\CarbonInterface;
use Database\Factories\HabitFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Habit extends Model
{
    use HasFactory, SoftDeletes;

    protected static function newFactory(): HabitFactory
    {
        return HabitFactory::new();
    }

    protected $fillable = [
        'user_id', 'name', 'icon', 'frequency_type',
        'frequency_days', 'frequency_times', 'category', 'color',
        'current_streak', 'best_streak', 'is_active',
    ];

    // Defaults em memória coerentes com a migration. Sem isto, um hábito recém
    // criado tem streaks nulos no objeto e o StreakService grava null.
    protected $attributes = [
        'current_streak' => 0,
        'best_streak'    => 0,
        'is_active'      => true,
    ];

    protected function casts(): array
    {
        return [
            'frequency_days' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function checkIns()
    {
        return $this->hasMany(HabitCheckIn::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function isExpectedOn(CarbonInterface $date, string $timezone): bool
    {
        return match ($this->frequency_type) {
            'daily'      => true,
            'weekly'     => in_array($date->dayOfWeek, $this->frequency_days ?? []),
            'x_per_week' => true,
            default      => false,
        };
    }

    /**
     * Aderência do hábito num intervalo [start, end], coerente com a frequência.
     *
     * Retorna [expected, done]:
     *  - daily/weekly: medido por DIA (cada dia esperado conta 1).
     *  - x_per_week:  medido por SEMANA (cada semana espera `frequency_times`;
     *                 os check-ins da semana são limitados ao alvo — fazer além
     *                 da meta não passa de 100%).
     *
     * Usa a relação `checkIns` já carregada (não dispara query).
     */
    public function adherenceInRange(CarbonInterface $start, CarbonInterface $end): array
    {
        $start = $start->copy()->startOfDay();
        $end   = $end->copy()->startOfDay();
        if ($start->gt($end)) {
            return [0, 0];
        }

        $dates = $this->checkIns->map(fn($ci) => $ci->date->toDateString());

        if ($this->frequency_type === 'x_per_week') {
            $target   = max(1, (int) $this->frequency_times);
            $expected = 0;
            $done     = 0;

            $weekStart = $start->copy()->startOfWeek(\Carbon\Carbon::MONDAY);
            while ($weekStart->lte($end)) {
                $weekEnd = $weekStart->copy()->endOfWeek(\Carbon\Carbon::SUNDAY);
                // Limita a contagem ao trecho da semana dentro do intervalo.
                $from = $weekStart->lt($start) ? $start : $weekStart;
                $to   = $weekEnd->gt($end) ? $end : $weekEnd;
                $count = $dates->filter(
                    fn($d) => $d >= $from->toDateString() && $d <= $to->toDateString()
                )->count();

                $expected += $target;
                $done     += min($count, $target);
                $weekStart->addWeek();
            }

            return [$expected, $done];
        }

        // daily / weekly — dia a dia
        $expected = 0;
        $done     = 0;
        $day      = $start->copy();
        while ($day->lte($end)) {
            if ($this->isExpectedOn($day, '')) {
                $expected++;
                if ($dates->contains($day->toDateString())) {
                    $done++;
                }
            }
            $day->addDay();
        }

        return [$expected, $done];
    }

    /**
     * Taxa de aderência (0–100) num intervalo. 0 quando nada é esperado.
     */
    public function adherenceRate(CarbonInterface $start, CarbonInterface $end): int
    {
        [$expected, $done] = $this->adherenceInRange($start, $end);

        return $expected > 0 ? (int) round($done / $expected * 100) : 0;
    }
}
