<?php

namespace App\Domains\Projects\Controllers;

use App\Domains\Projects\Models\Project;
use App\Http\Resources\ProjectResource;
use App\Http\Resources\WantResource;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        return Inertia::render('Projects/Index', [
            'projects' => ProjectResource::collection(
                $user->projects()->withCount('tasks')->with('tasks.column')->latest()->get()
            ),
            'wants' => WantResource::collection(
                $user->wants()->unpromoted()->orderByDesc('priority')->latest()->get()
            ),
        ]);
    }

    public function show(Request $request, Project $project)
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        return Inertia::render('Projects/Project', [
            'project' => ProjectResource::make(
                $project->load(['columns.tasks', 'notes', 'links'])
            ),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'status'      => 'nullable|in:active,paused,done,archived',
        ]);

        $validated['status'] ??= 'active';

        $request->user()->projects()->create($validated);

        return back();
    }

    public function update(Request $request, Project $project)
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'title'       => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'status'      => 'sometimes|in:active,paused,done,archived',
        ]);

        $project->update($validated);

        return back();
    }

    public function destroy(Request $request, Project $project)
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $project->delete();

        return back();
    }
}
