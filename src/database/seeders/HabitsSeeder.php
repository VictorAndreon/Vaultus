<?php

namespace Database\Seeders;

use App\Domains\Auth\Models\User;
use App\Domains\Habits\Models\Habit;
use App\Domains\Habits\Models\HealthMetric;
use App\Domains\Habits\Services\StreakService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class HabitsSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();
        if (! $user) {
            return;
        }

        $tz    = $user->timezone ?? 'America/Sao_Paulo';
        $today = Carbon::today($tz);
        $streak = app(StreakService::class);

        // Idempotente: limpa hábitos (forceDelete dispara o cascade dos check-ins) e métricas.
        Habit::where('user_id', $user->id)->forceDelete();
        HealthMetric::where('user_id', $user->id)->delete();

        // Helper: datas diárias entre os offsets [from..to] (0 = hoje), exceto $skip.
        $daily = fn(int $from, int $to, array $skip = []) => collect(range($from, $to))
            ->reject(fn($o) => in_array($o, $skip))
            ->map(fn($o) => $today->copy()->subDays($o)->toDateString())
            ->all();

        // Helper: dias com dayOfWeek específico (0=dom..6=sab) nos últimos N dias.
        $onWeekdays = function (array $weekdays, int $lookback) use ($today) {
            $dates = [];
            for ($o = 0; $o <= $lookback; $o++) {
                $d = $today->copy()->subDays($o);
                if (in_array($d->dayOfWeek, $weekdays)) {
                    $dates[] = $d->toDateString();
                }
            }
            return $dates;
        };

        // Helper: N check-ins por semana, distribuídos, nas últimas $weeks semanas.
        // A semana atual recebe o alvo limitado aos dias já decorridos (testa item 11).
        $perWeek = function (int $weeks, int $perWeek) use ($today) {
            $dates = [];
            for ($w = 0; $w < $weeks; $w++) {
                $weekStart = $today->copy()->startOfWeek(Carbon::MONDAY)->subWeeks($w);
                // Domingo à meia-noite (não endOfWeek 23:59) para o diff ser exato.
                $lastDay = $weekStart->copy()->addDays(6);
                if ($lastDay->gt($today)) {
                    $lastDay = $today->copy();
                }
                $daysInWeek = $weekStart->diffInDays($lastDay) + 1;
                $take = min($perWeek, $daysInWeek);
                for ($k = 0; $k < $take; $k++) {
                    $idx = $take > 1 ? (int) round($k * ($daysInWeek - 1) / ($take - 1)) : 0;
                    $dates[] = $weekStart->copy()->addDays($idx)->toDateString();
                }
            }
            return array_values(array_unique($dates));
        };

        // Cria hábito + check-ins e recalcula o streak.
        $make = function (array $attrs, array $dates) use ($user, $streak) {
            $habit = $user->habits()->create($attrs);
            foreach (array_unique($dates) as $date) {
                $habit->checkIns()->firstOrCreate(['date' => $date]);
            }
            $streak->recalculate($habit);
            return $habit;
        };

        // 1. Diário com streak longo e quase 100% de aderência.
        $make([
            'name' => 'Meditar', 'icon' => '🧘', 'frequency_type' => 'daily',
            'category' => 'Bem-estar', 'color' => 'var(--green)',
        ], $daily(0, 24));

        // 2. Diário com algumas falhas → taxa ~80%, streak curto.
        $make([
            'name' => 'Ler 30 minutos', 'icon' => '📚', 'frequency_type' => 'daily',
            'category' => 'Mente', 'color' => 'var(--gold)',
        ], $daily(0, 29, [3, 8, 13, 17, 22, 26]));

        // 3. Semanal em dias específicos (Seg/Qua/Sex) → FrequencyBadge "Seg · Qua · Sex".
        $make([
            'name' => 'Academia', 'icon' => '🏋️', 'frequency_type' => 'weekly',
            'frequency_days' => [1, 3, 5], 'category' => 'Saúde', 'color' => 'var(--sky)',
        ], $onWeekdays([1, 3, 5], 35));

        // 4. X vezes por semana → streak medido em SEMANAS, meta da semana atual cumprida.
        $make([
            'name' => 'Correr', 'icon' => '🏃', 'frequency_type' => 'x_per_week',
            'frequency_times' => 3, 'category' => 'Saúde', 'color' => 'var(--rose)',
        ], $perWeek(5, 3));

        // 5. Diário com streak quebrado (sem hoje nem ontem).
        $make([
            'name' => 'Beber água', 'icon' => '💧', 'frequency_type' => 'daily',
            'category' => 'Saúde', 'color' => 'var(--sky)',
        ], $daily(2, 29));

        // Métricas de saúde — hoje (decimais e valores coerentes) + histórico curto.
        HealthMetric::updateOrCreate(
            ['user_id' => $user->id, 'date' => $today->toDateString()],
            ['mood' => 4, 'energy' => 3, 'sleep_hours' => 7.5, 'water_liters' => 2, 'weight_kg' => 72.5, 'notes' => 'Dia produtivo, boa disposição.'],
        );

        $history = [
            ['mood' => 5, 'energy' => 4, 'sleep_hours' => 8, 'water_liters' => 2.5, 'weight_kg' => 72.6],
            ['mood' => 3, 'energy' => 3, 'sleep_hours' => 6.5, 'water_liters' => 1.8, 'weight_kg' => 72.8],
            ['mood' => 4, 'energy' => 4, 'sleep_hours' => 7, 'water_liters' => 2.2, 'weight_kg' => 72.7],
            ['mood' => 2, 'energy' => 2, 'sleep_hours' => 5.5, 'water_liters' => 1.5, 'weight_kg' => 73.0],
        ];
        foreach ($history as $i => $m) {
            HealthMetric::updateOrCreate(
                ['user_id' => $user->id, 'date' => $today->copy()->subDays($i + 1)->toDateString()],
                $m,
            );
        }
    }
}
