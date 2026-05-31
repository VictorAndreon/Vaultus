<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Services\FinanceDashboardAggregator;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;

class FinanceController extends Controller
{
    public function index(Request $request, FinanceDashboardAggregator $aggregator)
    {
        $validated = $request->validate([
            'from' => 'nullable|date_format:Y-m-d',
            'to'   => 'nullable|date_format:Y-m-d|after_or_equal:from',
        ]);

        $tz   = $request->user()->timezone ?? 'America/Sao_Paulo';
        $from = isset($validated['from']) ? Carbon::parse($validated['from'], $tz)->startOfDay() : null;
        $to   = isset($validated['to'])   ? Carbon::parse($validated['to'],   $tz)->endOfDay()   : null;

        return Inertia::render('Finance/Index', $aggregator->aggregate($request->user(), $from, $to));
    }

    public function updateSettings(Request $request)
    {
        $request->validate(['savings_goal_pct' => 'required|integer|min:1|max:100']);
        $request->user()->update(['savings_goal_pct' => $request->savings_goal_pct]);
        return back();
    }
}
