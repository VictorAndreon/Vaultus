<?php

namespace App\Domains\Dashboard\Services;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Transaction;
use App\Domains\Library\Models\LibraryItem;
use App\Domains\Projects\Models\ProjectTask;
use Carbon\Carbon;

class DashboardAggregator
{
    private function isDoneColumn(?string $name): bool
    {
        if (! $name) return false;
        $lower = strtolower($name);
        return str_contains($lower, 'done') || str_contains($lower, 'conclu');
    }

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

        $tasksDueToday = ProjectTask::whereHas(
            'project', fn($q) => $q->where('user_id', $user->id)
        )->whereDate('due_at', $today)->count();

        $maxStreak = $activeHabits->max('current_streak') ?? 0;

        $startOfMonth   = $now->copy()->startOfMonth()->toDateString();
        $monthCheckIns  = $activeHabits->sum(
            fn($h) => $h->checkIns->filter(fn($ci) => $ci->date->toDateString() >= $startOfMonth)->count()
        );
        $daysElapsed    = $now->day;
        $habitRate      = $expectedToday->count() > 0
            ? (int) round($monthCheckIns / ($daysElapsed * $expectedToday->count()) * 100)
            : 0;
        $topHabit       = $activeHabits->sortByDesc(
            fn($h) => $h->checkIns->filter(fn($ci) => $ci->date->toDateString() >= $startOfMonth)->count()
        )->first();

        $monthEnd  = $now->copy()->endOfMonth()->toDateString();
        $monthlyTx = Transaction::whereHas(
            'account', fn($q) => $q->where('user_id', $user->id)
        )
        ->whereBetween('occurred_at', [$startOfMonth, $monthEnd])
        ->whereNull('deleted_at')
        ->get();

        $monthIncome  = (float) $monthlyTx->where('type', 'income')->sum(fn($t) => (float) $t->amount_encrypted);
        $monthExpense = (float) $monthlyTx->where('type', 'expense')->sum(fn($t) => (float) $t->amount_encrypted);

        return [
            'tasks_due_today'            => $tasksDueToday,
            'habits_done_today'          => $doneToday->count(),
            'habits_total'               => $expectedToday->count(),
            'journal_entries_this_month' => $journalThisMonth,
            'open_projects'              => $user->projects()->where('status', 'active')->count(),
            'net_worth'                  => (float) $user->accounts()->with('transactions')->get()
                                               ->sum(fn($a) => $a->current_balance),
            'habit_streak'               => $maxStreak,
            'habit_rate'                 => $habitRate,
            'habit_top'                  => $topHabit?->name,
            'month_income'               => $monthIncome,
            'month_expense'              => $monthExpense,
        ];
    }

    public function getTasksToday(User $user): array
    {
        $today = Carbon::now($user->timezone)->toDateString();

        return ProjectTask::whereHas('project', fn($q) => $q->where('user_id', $user->id))
            ->whereDate('due_at', $today)
            ->with(['project', 'column'])
            ->orderByRaw("CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END")
            ->limit(8)
            ->get()
            ->map(fn($t) => [
                'id'           => $t->id,
                'title'        => $t->title,
                'project_name' => $t->project->title,
                'priority'     => $t->priority,
                'due_at'       => $t->due_at?->format('H:i'),
                'is_done'      => $this->isDoneColumn($t->column?->name),
            ])
            ->toArray();
    }

    public function getActiveProjects(User $user): array
    {
        return $user->projects()
            ->where('status', 'active')
            ->with(['tasks.column'])
            ->limit(5)
            ->get()
            ->map(function ($p) {
                $all    = $p->tasks;
                $done   = $all->filter(fn($t) => $this->isDoneColumn($t->column?->name));
                $total  = $all->count();
                $doneN  = $done->count();
                $pct    = $total > 0 ? (int) round($doneN / $total * 100) : 0;
                $next   = $all->first(fn($t) => ! $this->isDoneColumn($t->column?->name));

                return [
                    'id'               => $p->id,
                    'title'            => $p->title,
                    'status'           => $p->status,
                    'progress_percent' => $pct,
                    'next_task'        => $next?->title,
                    'tasks_done'       => $doneN,
                    'tasks_total'      => $total,
                ];
            })
            ->toArray();
    }

    public function getFinancialGoals(User $user): array
    {
        $ptMonths = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

        return $user->financialGoals()
            ->where('is_archived', false)
            ->with('transactionGoals')
            ->get()
            ->map(fn($g) => [
                'id'               => $g->id,
                'name'             => $g->name,
                'category'         => $g->category,
                'target_amount'    => (float) $g->target_amount_encrypted,
                'current_amount'   => $g->current_amount,
                'progress_percent' => $g->progress_percent,
                'deadline'         => $g->deadline
                    ? $ptMonths[$g->deadline->month - 1] . ' ' . $g->deadline->year
                    : null,
                'is_completed'     => $g->is_completed,
            ])
            ->toArray();
    }

    public function getWealthChart(User $user): array
    {
        $ptMonths = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        $now      = Carbon::now($user->timezone);

        $accounts  = $user->accounts()->with('transactions')->get();
        $netWorth  = (float) $accounts->sum(fn($a) => $a->current_balance);

        // Monthly deltas (income - expense) keyed by 'Y-m'
        $deltas = [];
        foreach ($accounts as $account) {
            foreach ($account->transactions as $t) {
                $key    = Carbon::parse($t->occurred_at)->format('Y-m');
                $amount = (float) $t->amount_encrypted;
                $deltas[$key] = ($deltas[$key] ?? 0.0)
                    + ($t->type === 'income' ? $amount : -$amount);
            }
        }

        // Reconstruct history backwards from current net worth
        $points  = [];
        $running = $netWorth;
        for ($i = 0; $i <= 12; $i++) {
            $month      = $now->copy()->subMonths($i);
            $key        = $month->format('Y-m');
            $label      = $ptMonths[$month->month - 1];
            $points[]   = ['label' => $label, 'value' => (float) round($running, 2)];
            $running   -= ($deltas[$key] ?? 0.0);
        }

        $points = array_reverse($points);

        return [
            'labels' => array_column($points, 'label'),
            'data'   => array_column($points, 'value'),
        ];
    }

    public function getReading(User $user): array
    {
        return LibraryItem::where('user_id', $user->id)
            ->where('type', 'book')
            ->where('status', 'reading')
            ->orderBy('started_at', 'desc')
            ->limit(3)
            ->get()
            ->map(fn($item) => [
                'id'               => $item->id,
                'title'            => $item->title,
                'author'           => $item->author,
                'progress_percent' => $item->progress_percent,
                'current_page'     => $item->current_page ?? 0,
                'total_pages'      => $item->total_pages,
                'cover_url'        => $item->cover_url,
            ])
            ->toArray();
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

    public function getJournalRecent(User $user): array
    {
        $moodLabel = [1 => 'Difícil', 2 => 'Cansado', 3 => 'Neutro', 4 => 'Calmo', 5 => 'Realizado'];
        $ptMonths  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

        return $user->journalEntries()
            ->orderBy('date', 'desc')
            ->limit(3)
            ->get()
            ->map(fn($e) => [
                'day'   => $e->date->format('d'),
                'month' => $ptMonths[$e->date->month - 1],
                'quote' => mb_substr(strip_tags($e->content ?? ''), 0, 120),
                'mood'  => $moodLabel[$e->mood ?? 0] ?? 'Sereno',
                'tag'   => implode(' · ', array_slice($e->tags ?? [], 0, 2)),
            ])
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
