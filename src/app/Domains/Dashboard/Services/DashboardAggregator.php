<?php

namespace App\Domains\Dashboard\Services;

use App\Domains\Auth\Models\User;

class DashboardAggregator
{
    public function getStats(User $user): array
    {
        return [
            'tasks_due_today'    => 0,
            'habits_done_today'  => 0,
            'habits_total'       => 0,
            'journal_streak'     => 0,
            'open_projects'      => 0,
        ];
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
