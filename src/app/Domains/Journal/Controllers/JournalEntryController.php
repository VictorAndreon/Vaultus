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

        $moodChart = $user->journalEntries()
            ->with('healthMetric')
            ->where('date', '>=', now()->subDays(30)->toDateString())
            ->orderBy('date')
            ->get()
            ->filter(fn($e) => $e->healthMetric?->mood !== null)
            ->map(fn($e) => ['label' => $e->date->format('d/M'), 'value' => $e->healthMetric->mood])
            ->values()
            ->toArray();

        return Inertia::render('Journal/Index', [
            'entries'    => $entries->map(fn($e) => new JournalEntryResource($e)),
            'prompts'    => $prompts->map(fn($p) => new JournalPromptResource($p)),
            'today'      => Carbon::now($user->timezone)->toDateString(),
            'mood_chart' => $moodChart,
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
            'title'   => 'nullable|string|max:200',
            'content' => 'nullable|string',
        ]);

        $request->user()->journalEntries()->create([
            'date'    => $validated['date'],
            'title'   => $validated['title'] ?? null,
            'content' => $validated['content'] ?? '',
        ]);

        return back();
    }

    public function update(Request $request, JournalEntry $entry)
    {
        abort_if($entry->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'title'   => 'nullable|string|max:200',
            'content' => 'nullable|string',
            'tags'    => 'sometimes|array',
            'tags.*'  => 'string|max:50',
        ]);

        $entry->update($validated);

        return back();
    }
}
