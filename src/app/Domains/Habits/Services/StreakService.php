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

        // Semana atual começa na segunda
        $currentWeekStart = $today->copy()->startOfWeek(Carbon::MONDAY);
        // Começar da semana anterior (semana atual pode estar incompleta)
        $weekStart = $currentWeekStart->copy()->subWeek();
        $earliest = $checkIns->min()->copy()->startOfWeek(Carbon::MONDAY);
        $streak = 0;

        while ($weekStart->gte($earliest)) {
            $weekEnd = $weekStart->copy()->addDays(6);
            $count = $checkIns->filter(
                fn($d) => $d->between($weekStart, $weekEnd)
            )->count();

            if ($count >= $habit->frequency_times) {
                $streak++;
            } else {
                break;
            }

            $weekStart->subWeek();
        }

        $best = max($habit->best_streak, $streak);
        $habit->update(['current_streak' => $streak, 'best_streak' => $best]);
    }
}
