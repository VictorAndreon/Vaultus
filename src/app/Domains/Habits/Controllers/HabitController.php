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
        $user  = $request->user();
        $today = Carbon::now($user->timezone)->toDateString();

        $habits = $user->habits()
            ->active()
            ->with(['checkIns' => fn($q) => $q->where('date', '>=',
                Carbon::now($user->timezone)->subDays(6)->toDateString()
            )])
            ->get();

        $todayMetric = HealthMetric::where('user_id', $user->id)
            ->whereDate('date', $today)
            ->first();

        return Inertia::render('Habits/Index', [
            'habits'        => HabitResource::collection($habits),
            'today_metrics' => $todayMetric ? HealthMetricResource::make($todayMetric) : null,
            'today'         => $today,
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
