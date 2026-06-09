<?php

namespace App\Domains\Tasks\Controllers;

use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectTask;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;

class TasksController extends Controller
{
    public function index(Request $request)
    {
        $user     = $request->user();
        $now      = Carbon::now($user->timezone);
        $today    = $now->toDateString();
        $weekEnd  = $now->copy()->endOfWeek()->toDateString();

        $allTasks = ProjectTask::whereHas(
            'project', fn($q) => $q->where('user_id', $user->id)
        )
        ->with(['project', 'column'])
        ->orderByRaw("CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END")
        ->orderBy('due_at')
        ->get();

        $isDone = fn ($t) => $t->isDone();

        $tasks = $allTasks->map(fn($t) => [
            'id'           => $t->id,
            'title'        => $t->title,
            'project_name' => $t->project->title,
            'priority'     => $t->priority,
            'due_at'       => $t->due_at?->format('d/m H:i'),
            'due_date'     => $t->due_at?->toDateString(),
            'is_done'      => $isDone($t),
            'group'        => $isDone($t)
                ? 'done_today'
                : (! $t->due_at
                    ? 'later'
                    : ($t->due_at->toDateString() === $today ? 'today'
                        : ($t->due_at->toDateString() <= $weekEnd ? 'week' : 'later'))),
        ])->values()->toArray();

        $todayTasks = collect($tasks)->where('due_date', $today);
        $doneTasks  = collect($tasks)->where('is_done', true)->where('due_date', $today);
        $weekTasks  = collect($tasks)->whereBetween('due_date', [$now->copy()->addDay()->toDateString(), $weekEnd]);
        $noDue      = $allTasks->filter(fn($t) => $t->due_at === null && ! $isDone($t));
        $inbox      = $allTasks->filter(fn($t) => $t->triaged_at === null && ! $isDone($t));

        $byProject = ProjectTask::whereHas('project', fn($q) => $q->where('user_id', $user->id))
            ->with('project')
            ->get()
            ->groupBy('project_id')
            ->map(fn($tasks, $id) => [
                'project_name' => $tasks->first()->project->title,
                'count'        => $tasks->count(),
            ])
            ->values()
            ->toArray();

        // Projetos (com colunas) p/ o modal de criação rápida de tarefa.
        // Só os que têm ao menos uma coluna podem receber tarefa.
        $projects = Project::where('user_id', $user->id)
            ->whereIn('status', ['active', 'paused'])
            ->with('columns:id,project_id,name')
            ->orderBy('title')
            ->get()
            ->filter(fn($p) => $p->columns->isNotEmpty())
            ->map(fn($p) => [
                'id'      => $p->id,
                'title'   => $p->title,
                'columns' => $p->columns->map(fn($c) => ['id' => $c->id, 'name' => $c->name])->values()->toArray(),
            ])
            ->values()
            ->toArray();

        $board = Project::where('user_id', $user->id)
            ->whereIn('status', ['active', 'paused'])
            ->with(['columns' => fn ($q) => $q->orderBy('position'), 'columns.tasks'])
            ->orderBy('title')
            ->get()
            ->map(fn ($p) => [
                'id'      => $p->id,
                'title'   => $p->title,
                'columns' => $p->columns->map(fn ($c) => [
                    'id'    => $c->id,
                    'name'  => $c->name,
                    'tasks' => $c->tasks->map(fn ($t) => [
                        'id'       => $t->id,
                        'title'    => $t->title,
                        'priority' => $t->priority,
                        'is_done'  => $t->completed_at !== null || $c->isDoneColumn(),
                    ])->values()->toArray(),
                ])->values()->toArray(),
            ])
            ->values()
            ->toArray();

        return Inertia::render('Tasks/Index', [
            'tasks'        => $tasks,
            'stats'        => [
                'today'     => $todayTasks->count(),
                'overdue'   => 0,
                'this_week' => $weekTasks->count(),
                'no_due'    => $noDue->count(),
            ],
            'by_project'   => $byProject,
            'projects'     => $projects,
            'no_due_tasks' => $noDue->take(5)->map(fn($t) => [
                'id'    => $t->id,
                'title' => $t->title,
            ])->values()->toArray(),
            'inbox' => $inbox->map(fn($t) => [
                'id'           => $t->id,
                'title'        => $t->title,
                'project_id'   => $t->project_id,
                'project_name' => $t->project->title,
                'priority'     => $t->priority,
            ])->values()->toArray(),
            'inbox_count' => $inbox->count(),
            'projects_board' => $board,
        ]);
    }
}
