<?php

namespace App\Domains\Projects\Controllers;

use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectNote;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class ProjectNoteController extends Controller
{
    public function store(Request $request, Project $project)
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $validated = $request->validate(['content' => 'required|string']);

        $project->notes()->create($validated);

        return back();
    }

    public function update(Request $request, ProjectNote $note)
    {
        abort_if($note->project->user_id !== $request->user()->id, 403);

        $validated = $request->validate(['content' => 'required|string']);

        $note->update($validated);

        return back();
    }

    public function destroy(Request $request, ProjectNote $note)
    {
        abort_if($note->project->user_id !== $request->user()->id, 403);

        $note->delete();

        return back();
    }
}
