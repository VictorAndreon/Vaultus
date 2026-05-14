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
            'journal_recent'  => $this->aggregator->getJournalRecent($user),
            'habits_today'    => $this->aggregator->getHabitsToday($user),
            'tasks_today'     => $this->aggregator->getTasksToday($user),
            'projects'        => $this->aggregator->getActiveProjects($user),
            'financial_goals' => $this->aggregator->getFinancialGoals($user),
            'wealth_chart'    => $this->aggregator->getWealthChart($user),
            'reading'         => $this->aggregator->getReading($user),
        ]);
    }
}
