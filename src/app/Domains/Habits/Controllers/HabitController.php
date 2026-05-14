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

        $habits = $user->habits()
            ->active()
            ->with(['checkIns' => fn($q) => $q->where('date', '>=',
                $now->copy()->subDays(6)->toDateString()
            )])
            ->get();

        $todayMetric = HealthMetric::where('user_id', $user->id)
            ->whereDate('date', $today)
            ->first();

        // 12 semanas de consistência
        $activeHabits = $user->habits()->active()->with(['checkIns'])->get();
        $weeklyRate   = [];
        $weekLabels   = [];

        for ($w = 11; $w >= 0; $w--) {
            $weekStart = $now->copy()->startOfWeek()->subWeeks($w);
            $label     = 'S' . (12 - $w);

            $totalExpected = 0;
            $totalDone     = 0;

            foreach ($activeHabits as $habit) {
                for ($d = 0; $d < 7; $d++) {
                    $day = $weekStart->copy()->addDays($d);
                    if ($day->isAfter($now)) continue;
                    if ($habit->isExpectedOn($day, $timezone)) {
                        $totalExpected++;
                        $dateStr = $day->toDateString();
                        if ($habit->checkIns->contains(fn($ci) => $ci->date->toDateString() === $dateStr)) {
                            $totalDone++;
                        }
                    }
                }
            }

            $weeklyRate[] = $totalExpected > 0 ? (int) round($totalDone / $totalExpected * 100) : 0;
            $weekLabels[] = $label;
        }

        $avgRate       = count($weeklyRate) ? (int) round(array_sum($weeklyRate) / count($weeklyRate)) : 0;
        $bestStreak    = $activeHabits->max('best_streak') ?? 0;
        $currentStreak = $activeHabits->max('current_streak') ?? 0;

        return Inertia::render('Habits/Index', [
            'habits'        => $habits->map(fn($h) => new HabitResource($h)),
            'today_metrics' => $todayMetric ? HealthMetricResource::make($todayMetric) : null,
            'today'         => $today,
            'consistency'   => [
                'labels' => $weekLabels,
                'data'   => $weeklyRate,
            ],
            'insights'      => [
                'avg_rate'       => $avgRate,
                'best_streak'    => $bestStreak,
                'current_streak' => $currentStreak,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'             => 'required|string|max:255',
            'icon'             => 'nullable|string|max:10',
            'frequency_type'   => 'required|in:daily,weekly,x_per_week',
            'frequency_days'   => 'required_if:frequency_type,weekly|array',
            'frequency_days.*' => 'integer|min:0|max:6',
            'frequency_times'  => 'required_if:frequency_type,x_per_week|integer|min:1|max:7',
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
