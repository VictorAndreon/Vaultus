<?php

namespace App\Domains\Projects\Controllers;

use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectColumn;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class ProjectColumnController extends Controller
{
    public function store(Request $request, Project $project)
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'position' => 'nullable|integer|min:0',
        ]);

        $project->columns()->create($validated);

        return back();
    }

    public function update(Request $request, Project $project, ProjectColumn $column)
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'name'     => 'sometimes|string|max:255',
            'position' => 'sometimes|integer|min:0',
        ]);

        $column->update($validated);

        return back();
    }

    public function destroy(Request $request, Project $project, ProjectColumn $column)
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $column->delete();

        return back();
    }
}
