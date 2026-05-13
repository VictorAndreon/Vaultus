<?php

namespace App\Domains\Projects\Controllers;

use App\Domains\Projects\Models\Want;
use App\Domains\Projects\Services\WantPromotionService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class WantController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'category'    => 'nullable|string|max:100',
            'priority'    => 'nullable|in:low,medium,high',
        ]);

        $validated['priority'] ??= 'medium';

        $request->user()->wants()->create($validated);

        return back();
    }

    public function update(Request $request, Want $want)
    {
        abort_if($want->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'title'       => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'category'    => 'nullable|string|max:100',
            'priority'    => 'sometimes|in:low,medium,high',
        ]);

        $want->update($validated);

        return back();
    }

    public function destroy(Request $request, Want $want)
    {
        abort_if($want->user_id !== $request->user()->id, 403);

        $want->delete();

        return back();
    }

    public function promote(Request $request, Want $want, WantPromotionService $service)
    {
        abort_if($want->user_id !== $request->user()->id, 403);

        $project = $service->promote($want);

        return redirect("/projects/{$project->id}");
    }
}
