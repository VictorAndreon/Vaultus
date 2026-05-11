<?php

namespace App\Domains\Habits\Controllers;

use App\Domains\Habits\Models\HealthMetric;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class HealthMetricController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'mood'         => 'nullable|integer|min:1|max:5',
            'energy'       => 'nullable|integer|min:1|max:5',
            'sleep_hours'  => 'nullable|numeric|min:0|max:24',
            'water_liters' => 'nullable|numeric|min:0|max:20',
            'weight_kg'    => 'nullable|numeric|min:0|max:500',
            'notes'        => 'nullable|string|max:1000',
        ]);

        $today = Carbon::now($request->user()->timezone)->toDateString();

        HealthMetric::updateOrCreate(
            ['user_id' => $request->user()->id, 'date' => $today],
            $validated
        );

        return back()->with('success', 'Métricas salvas.');
    }
}
