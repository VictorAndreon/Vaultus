<?php

namespace App\Domains\Dashboard\Controllers;

use App\Domains\Dashboard\Services\DashboardAggregator;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __construct(private DashboardAggregator $aggregator) {}

    public function index(Request $request)
    {
        $user = $request->user();

        return Inertia::render('Dashboard/Index', [
            'stats'           => $this->aggregator->getStats($user),
            'recent_activity' => $this->aggregator->getRecentActivity($user),
        ]);
    }
}
