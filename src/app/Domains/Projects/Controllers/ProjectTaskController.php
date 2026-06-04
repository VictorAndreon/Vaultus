<?php

namespace App\Domains\Projects\Controllers;

use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectColumn;
use App\Domains\Projects\Models\ProjectTask;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProjectTaskController extends Controller
{
    public function store(Request $request, Project $project)
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'title'             => 'required|string|max:255',
            'description'       => 'nullable|string',
            'project_column_id' => ['required', 'integer', Rule::exists('project_columns', 'id')->where('project_id', $project->id)],
            'priority'          => 'nullable|in:low,medium,high,urgent',
            'due_at'            => 'nullable|date',
        ]);

        $maxPos = $project->tasks()
            ->where('project_column_id', $validated['project_column_id'])
            ->max('position') ?? -1;

        $validated['position'] = $maxPos + 1;
        $validated['priority'] ??= 'medium';
        $validated['triaged_at'] = now();

        $project->tasks()->create($validated);

        return back();
    }

    public function update(Request $request, ProjectTask $task)
    {
        abort_if($task->project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'title'       => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'priority'    => 'sometimes|in:low,medium,high,urgent',
            'due_at'      => 'nullable|date',
        ]);

        $task->update($validated);

        return back();
    }

    public function toggleDone(Request $request, ProjectTask $task): \Illuminate\Http\RedirectResponse
    {
        abort_if($task->project->user_id !== $request->user()->id, 403);

        DB::transaction(function () use ($task) {
            if ($task->completed_at === null) {
                $task->update(['completed_at' => now()]);
                $doneColumn = $this->resolveDoneColumn($task->project);
                $this->placeTaskInColumn($task, $doneColumn->id);
            } else {
                $task->update(['completed_at' => null]);

                if ($task->column && $task->column->isDoneColumn()) {
                    $target = $task->project->columns()
                        ->get()
                        ->filter(fn (ProjectColumn $c) => ! $c->isDoneColumn())
                        ->sortByDesc('position')
                        ->first();

                    if ($target) {
                        $this->placeTaskInColumn($task, $target->id);
                    }
                }
            }
        });

        return back();
    }

    /**
     * Coluna "Concluído" do projeto (a primeira por posição). Cria uma se não existir.
     */
    private function resolveDoneColumn(Project $project): ProjectColumn
    {
        $columns  = $project->columns()->get();
        $existing = $columns->first(fn (ProjectColumn $c) => $c->isDoneColumn());

        if ($existing) {
            return $existing;
        }

        return $project->columns()->create([
            'name'     => 'Concluído',
            'position' => $columns->count(),
        ]);
    }

    /**
     * Move a tarefa para a coluna informada e renormaliza as posições dos irmãos.
     * $position = null → append no fim da coluna.
     */
    private function placeTaskInColumn(ProjectTask $task, int $columnId, ?int $position = null): void
    {
        $task->update(['project_column_id' => $columnId]);

        $siblings = ProjectTask::where('project_column_id', $columnId)
            ->where('id', '!=', $task->id)
            ->orderBy('position')
            ->get();

        $insertAt = $position ?? $siblings->count();
        $siblings->splice($insertAt, 0, [$task]);

        foreach ($siblings as $i => $t) {
            $t->update(['position' => $i]);
        }
    }

    public function destroy(Request $request, ProjectTask $task)
    {
        abort_if($task->project->user_id !== $request->user()->id, 403);

        $task->delete();

        return back();
    }

    public function move(Request $request, ProjectTask $task)
    {
        abort_if($task->project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'project_column_id' => ['required', 'integer', Rule::exists('project_columns', 'id')->where('project_id', $task->project_id)],
            'position'          => 'required|integer|min:0',
        ]);

        DB::transaction(function () use ($task, $validated) {
            $this->placeTaskInColumn($task, $validated['project_column_id'], $validated['position']);

            $destColumn = ProjectColumn::find($validated['project_column_id']);
            $destIsDone = $destColumn?->isDoneColumn() ?? false;

            if ($destIsDone && $task->completed_at === null) {
                $task->update(['completed_at' => now()]);
            } elseif (! $destIsDone && $task->completed_at !== null) {
                $task->update(['completed_at' => null]);
            }
        });

        return back();
    }
}
