<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Services\FinanceDashboardAggregator;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;

class FinanceController extends Controller
{
    public function index(Request $request, FinanceDashboardAggregator $aggregator)
    {
        return Inertia::render('Finance/Index', $aggregator->aggregate($request->user()));
    }

    public function updateSettings(Request $request)
    {
        $request->validate(['savings_goal_pct' => 'required|integer|min:1|max:100']);
        $request->user()->update(['savings_goal_pct' => $request->savings_goal_pct]);
        return back();
    }
}
