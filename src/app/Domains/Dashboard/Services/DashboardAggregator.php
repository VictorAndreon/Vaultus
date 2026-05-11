<?php

namespace App\Domains\Dashboard\Services;

use App\Domains\Auth\Models\User;
use Carbon\Carbon;

class DashboardAggregator
{
    public function getStats(User $user): array
    {
        $now   = Carbon::now($user->timezone);
        $today = $now->toDateString();

        $activeHabits = $user->habits()->active()->with('checkIns')->get();

        $expectedToday = $activeHabits->filter(
            fn($h) => $h->isExpectedOn($now, $user->timezone)
        );

        $doneToday = $expectedToday->filter(
            fn($h) => $h->checkIns->contains(fn($ci) => $ci->date->toDateString() === $today)
        );

        $journalThisMonth = $user->journalEntries()
            ->whereMonth('date', $now->month)
            ->whereYear('date', $now->year)
            ->count();

        return [
            'tasks_due_today'            => 0,
            'habits_done_today'          => $doneToday->count(),
            'habits_total'               => $expectedToday->count(),
            'journal_entries_this_month' => $journalThisMonth,
            'open_projects'              => 0,
            'net_worth'                  => (float) $user->accounts()->with('transactions')->get()->sum(fn($a) => $a->current_balance),
        ];
    }

    public function getHabitsToday(User $user): array
    {
        $now   = Carbon::now($user->timezone);
        $today = $now->toDateString();

        return $user->habits()
            ->active()
            ->with(['checkIns' => fn($q) => $q->whereDate('date', $today)])
            ->get()
            ->filter(fn($h) => $h->isExpectedOn($now, $user->timezone))
            ->map(fn($h) => [
                'id'               => $h->id,
                'name'             => $h->name,
                'icon'             => $h->icon,
                'checked_in_today' => $h->checkIns->isNotEmpty(),
            ])
            ->values()
            ->toArray();
    }

    public function getRecentActivity(User $user): array
    {
        return $user->auditLogs()
            ->latest('created_at')
            ->limit(5)
            ->get(['event', 'created_at'])
            ->toArray();
    }
}
