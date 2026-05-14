<?php

namespace App\Domains\Projects\Controllers;

use App\Domains\Projects\Models\Project;
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

    public function toggleDone(Request $request, ProjectTask $task): \Illuminate\Http\Response
    {
        abort_if($task->project->user_id !== $request->user()->id, 403);

        $task->update([
            'completed_at' => $task->completed_at ? null : now(),
        ]);

        return response()->noContent();
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
            'project_column_id' => 'required|integer|exists:project_columns,id',
            'position'          => 'required|integer|min:0',
        ]);

        DB::transaction(function () use ($task, $validated) {
            $task->update(['project_column_id' => $validated['project_column_id']]);

            $siblings = ProjectTask::where('project_column_id', $validated['project_column_id'])
                ->where('id', '!=', $task->id)
                ->orderBy('position')
                ->get();

            $siblings->splice($validated['position'], 0, [$task]);

            foreach ($siblings as $i => $t) {
                $t->update(['position' => $i]);
            }
        });

        return back();
    }
}
