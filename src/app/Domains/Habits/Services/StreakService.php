<?php

namespace App\Domains\Habits\Services;

use App\Domains\Habits\Models\Habit;
use Carbon\Carbon;

class StreakService
{
    public function recalculate(Habit $habit): void
    {
        $habit->loadMissing('user');
        $timezone = $habit->user->timezone;
        $today = Carbon::now($timezone)->startOfDay();

        if ($habit->frequency_type === 'x_per_week') {
            $this->recalculateWeeklyStreak($habit, $today);
        } else {
            $this->recalculateDailyStreak($habit, $today, $timezone);
        }
    }

    private function recalculateDailyStreak(Habit $habit, Carbon $today, string $timezone): void
    {
        $checkIns = $habit->checkIns()
            ->orderByDesc('date')
            ->pluck('date')
            ->mapWithKeys(fn($date) => [
                Carbon::parse($date)->toDateString() => true,
            ]);

        if ($checkIns->isEmpty()) {
            $habit->update(['current_streak' => 0, 'best_streak' => $habit->best_streak]);
            return;
        }

        $date = $today->copy();

        // Não penaliza hoje se ainda não foi feito
        if ($habit->isExpectedOn($date, $timezone) && ! $checkIns->has($date->toDateString())) {
            $date->subDay();
        }

        $earliest = Carbon::parse($checkIns->keys()->last());
        $streak = 0;

        while ($date->gte($earliest)) {
            if ($habit->isExpectedOn($date, $timezone)) {
                if ($checkIns->has($date->toDateString())) {
                    $streak++;
                } else {
                    break;
                }
            }
            $date->subDay();
        }

        $best = max($habit->best_streak, $streak);
        $habit->update(['current_streak' => $streak, 'best_streak' => $best]);
    }

    private function recalculateWeeklyStreak(Habit $habit, Carbon $today): void
    {
        $checkIns = $habit->checkIns()
            ->pluck('date')
            ->map(fn($d) => Carbon::parse($d));

        if ($checkIns->isEmpty()) {
            $habit->update(['current_streak' => 0, 'best_streak' => $habit->best_streak]);
            return;
        }

        // Alvo mínimo de check-ins por semana. Guard contra frequency_times
        // ausente/zero (estado inválido): degrada para 1x/semana em vez de
        // tratar QUALQUER contagem como meta cumprida (>= null vira >= 0).
        $target = max(1, (int) $habit->frequency_times);

        // Inicia na semana atual: se a meta já foi cumprida, conta de imediato.
        $weekStart = $today->copy()->startOfWeek(Carbon::MONDAY);
        $earliest  = $checkIns->min()->copy()->startOfWeek(Carbon::MONDAY);
        $streak    = 0;
        $isCurrentWeek = true;

        while ($weekStart->gte($earliest)) {
            $weekEnd = $weekStart->copy()->addDays(6);
            // Compara por data pura (YYYY-MM-DD): os check-ins são parseados sem
            // fuso, então `between` de Carbon deslocaria a fronteira da semana no
            // timezone do usuário e excluiria a segunda-feira.
            $from  = $weekStart->toDateString();
            $to    = $weekEnd->toDateString();
            $count = $checkIns->filter(
                fn($d) => $d->toDateString() >= $from && $d->toDateString() <= $to
            )->count();

            if ($count >= $target) {
                $streak++;
            } elseif (! $isCurrentWeek) {
                // Semana passada sem a meta quebra o streak.
                // A semana corrente incompleta não penaliza (ainda em andamento).
                break;
            }

            $isCurrentWeek = false;
            $weekStart->subWeek();
        }

        $best = max($habit->best_streak, $streak);
        $habit->update(['current_streak' => $streak, 'best_streak' => $best]);
    }
}
