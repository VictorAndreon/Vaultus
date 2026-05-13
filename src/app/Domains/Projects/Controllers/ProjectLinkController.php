<?php

namespace App\Domains\Projects\Controllers;

use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectLink;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class ProjectLinkController extends Controller
{
    public function store(Request $request, Project $project)
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'url'   => 'required|url|max:2048',
        ]);

        $project->links()->create($validated);

        return back();
    }

    public function destroy(Request $request, ProjectLink $link)
    {
        abort_if($link->project->user_id !== $request->user()->id, 403);

        $link->delete();

        return back();
    }
}
