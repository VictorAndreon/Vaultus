<?php

namespace App\Domains\Habits\Controllers;

use App\Domains\Habits\Models\Habit;
use App\Domains\Habits\Models\HealthMetric;
use App\Http\Resources\HabitResource;
use App\Http\Resources\HealthMetricResource;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;

class HabitController extends Controller
{
    public function index(Request $request)
    {
        $user     = $request->user();
        $timezone = $user->timezone ?? 'America/Sao_Paulo';
        $now      = Carbon::now($timezone);
        $today    = $now->toDateString();

        // Janela única de 12 semanas: cobre os week dots (7d), a taxa de 30d e
        // o gráfico de consistência — sem segunda query nem histórico ilimitado.
        $windowStart = $now->copy()->startOfWeek(Carbon::MONDAY)->subWeeks(11)->toDateString();

        $habits = $user->habits()
            ->active()
            ->with(['checkIns' => fn($q) => $q->where('date', '>=', $windowStart)])
            ->get();

        $todayMetric = HealthMetric::where('user_id', $user->id)
            ->whereDate('date', $today)
            ->first();

        // 12 semanas de consistência, agregada entre hábitos e coerente por tipo
        // (x_per_week medido por semana; daily/weekly por dia esperado).
        $weeklyRate = [];
        $weekLabels = [];

        for ($w = 11; $w >= 0; $w--) {
            $weekStart = $now->copy()->startOfWeek(Carbon::MONDAY)->subWeeks($w);
            $weekEnd   = $weekStart->copy()->addDays(6);
            if ($weekEnd->gt($now)) {
                $weekEnd = $now->copy();
            }

            $totalExpected = 0;
            $totalDone     = 0;
            foreach ($habits as $habit) {
                [$expected, $done] = $habit->adherenceInRange($weekStart, $weekEnd);
                $totalExpected += $expected;
                $totalDone     += $done;
            }

            $weeklyRate[] = $totalExpected > 0 ? (int) round($totalDone / $totalExpected * 100) : 0;
            $weekLabels[] = 'S' . (12 - $w);
        }

        $avgRate    = count($weeklyRate) ? (int) round(array_sum($weeklyRate) / count($weeklyRate)) : 0;
        $topCurrent = $habits->sortByDesc('current_streak')->first();
        $topBest    = $habits->sortByDesc('best_streak')->first();
        $unitOf     = fn($h) => $h && $h->frequency_type === 'x_per_week' ? 'semanas' : 'dias';

        return Inertia::render('Habits/Index', [
            // resolve() entrega o array já filtrado (sem o envelope `data` que o
            // Inertia adiciona ao serializar JsonResource). O front lê os campos
            // no topo (habit.id, habit.name, today_metrics.mood); passar o Resource
            // cru re-introduz o wrapper e quebra tudo (id undefined, etc.).
            'habits'        => $habits->map(fn($h) => (new HabitResource($h))->resolve($request)),
            'today_metrics' => $todayMetric ? (new HealthMetricResource($todayMetric))->resolve($request) : null,
            'today'         => $today,
            'consistency'   => [
                'labels' => $weekLabels,
                'data'   => $weeklyRate,
            ],
            'insights'      => [
                'avg_rate'            => $avgRate,
                'best_streak'        => $topBest?->best_streak ?? 0,
                'best_streak_unit'    => $unitOf($topBest),
                'current_streak'     => $topCurrent?->current_streak ?? 0,
                'current_streak_unit' => $unitOf($topCurrent),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'             => 'required|string|max:255',
            'icon'             => 'nullable|string|max:10',
            'frequency_type'   => 'required|in:daily,weekly,x_per_week',
            'frequency_days'   => 'nullable|required_if:frequency_type,weekly|array',
            'frequency_days.*' => 'integer|min:0|max:6',
            'frequency_times'  => 'nullable|required_if:frequency_type,x_per_week|integer|min:1|max:7',
            'category'         => 'nullable|string|max:100',
        ]);

        $request->user()->habits()->create($validated);

        return back();
    }

    public function update(Request $request, Habit $habit)
    {
        abort_if($habit->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'name'             => 'sometimes|string|max:255',
            'icon'             => 'nullable|string|max:10',
            'frequency_type'   => 'sometimes|in:daily,weekly,x_per_week',
            'frequency_days'   => 'sometimes|nullable|array',
            'frequency_days.*' => 'integer|min:0|max:6',
            'frequency_times'  => 'sometimes|nullable|integer|min:1|max:7',
            'category'         => 'nullable|string|max:100',
            'is_active'        => 'sometimes|boolean',
        ]);

        $habit->update($validated);

        return back();
    }

    public function destroy(Request $request, Habit $habit)
    {
        abort_if($habit->user_id !== $request->user()->id, 403);

        $habit->delete();

        return back();
    }
}
