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
            // resolve() desembrulha o envelope `data` que o Inertia adiciona ao
            // serializar JsonResource — o front lê os campos no topo (e.date,
            // e.tags, prompt.content). Sem isso, calendário/lista/prompts quebram
            // e não dá para abrir entradas existentes (find por e.date falha).
            'entries'    => $entries->map(fn($e) => (new JournalEntryResource($e))->resolve($request)),
            'prompts'    => $prompts->map(fn($p) => (new JournalPromptResource($p))->resolve($request)),
            'today'      => Carbon::now($user->timezone)->toDateString(),
            'mood_chart' => $moodChart,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        // Criação é restrita ao "hoje" do usuário (fuso). Entradas de dias
        // passados só existem se já foram criadas naquele dia — depois disso
        // são editadas via update(). Espelha o botão "Escrever hoje" do front.
        $today = Carbon::now($user->timezone)->toDateString();

        $validated = $request->validate([
            'date'    => [
                'required',
                'date_format:Y-m-d',
                \Illuminate\Validation\Rule::in([$today]),
                \Illuminate\Validation\Rule::unique('journal_entries')->where(fn ($q) => $q->where('user_id', $user->id)),
            ],
            'title'   => 'nullable|string|max:200',
            'content' => 'nullable|string',
            'tags'    => 'sometimes|array',
            'tags.*'  => 'nullable|string|max:50',
        ]);

        $user->journalEntries()->create([
            'date'    => $validated['date'],
            'title'   => $validated['title'] ?? null,
            'content' => $validated['content'] ?? '',
            'tags'    => $this->normalizeTags($validated['tags'] ?? []),
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
            'tags.*'  => 'nullable|string|max:50',
        ]);

        if (array_key_exists('tags', $validated)) {
            $validated['tags'] = $this->normalizeTags($validated['tags']);
        }

        $entry->update($validated);

        return back();
    }

    /** Limpa, deduplica e descarta tags vazias antes de persistir. */
    private function normalizeTags(?array $tags): array
    {
        return collect($tags ?? [])
            ->map(fn ($t) => trim((string) $t))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }
}
