<?php

namespace App\Domains\Journal\Controllers;

use App\Domains\Journal\Models\JournalEntry;
use App\Http\Resources\JournalEntryResource;
use App\Http\Resources\JournalPromptResource;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;

class JournalEntryController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $entries = $user->journalEntries()
            ->with('healthMetric')
            ->latest('date')
            ->limit(90)
            ->get();

        $prompts = $user->journalPrompts()->active()->get();

        return Inertia::render('Journal/Index', [
            'entries' => JournalEntryResource::collection($entries),
            'prompts' => JournalPromptResource::collection($prompts),
            'today'   => Carbon::now($user->timezone)->toDateString(),
        ]);
    }

    public function store(Request $request)
    {
        $userId = $request->user()->id;

        $validated = $request->validate([
            'date'    => [
                'required',
                'date_format:Y-m-d',
                \Illuminate\Validation\Rule::unique('journal_entries')->where(fn ($q) => $q->where('user_id', $userId)),
            ],
            'content' => 'nullable|string',
        ]);

        $request->user()->journalEntries()->create([
            'date'    => $validated['date'],
            'content' => $validated['content'] ?? '',
        ]);

        return back();
    }

    public function update(Request $request, JournalEntry $entry)
    {
        abort_if($entry->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'content' => 'nullable|string',
            'tags'    => 'sometimes|array',
            'tags.*'  => 'string|max:50',
        ]);

        $entry->update($validated);

        return back();
    }
}
