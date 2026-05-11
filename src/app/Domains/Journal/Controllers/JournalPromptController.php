<?php

namespace App\Domains\Journal\Controllers;

use App\Domains\Journal\Models\JournalPrompt;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class JournalPromptController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'content' => 'required|string|max:500',
        ]);

        $request->user()->journalPrompts()->create([
            'content'   => $validated['content'],
            'is_active' => true,
            'position'  => 0,
        ]);

        return back();
    }

    public function update(Request $request, JournalPrompt $prompt)
    {
        abort_if($prompt->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'content'   => 'sometimes|string|max:500',
            'is_active' => 'sometimes|boolean',
            'position'  => 'sometimes|integer|min:0',
        ]);

        $prompt->update($validated);

        return back();
    }

    public function destroy(Request $request, JournalPrompt $prompt)
    {
        abort_if($prompt->user_id !== $request->user()->id, 403);

        $prompt->delete();

        return back();
    }
}
