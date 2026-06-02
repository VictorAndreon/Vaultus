<?php

namespace App\Domains\Library\Controllers;

use App\Domains\Library\Models\LibraryItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class LibraryController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $reading = LibraryItem::where('user_id', $user->id)
            ->where('type', 'book')
            ->where('status', 'reading')
            ->orderBy('started_at', 'desc')
            ->get()
            ->map(fn($b) => array_merge($this->bookPayload($b), [
                'started_label' => $b->started_at?->format('M Y'),
            ]))
            ->values()
            ->toArray();

        $doneRecent = LibraryItem::where('user_id', $user->id)
            ->where('type', 'book')
            ->where('status', 'done')
            ->orderBy('finished_at', 'desc')
            ->limit(8)
            ->get()
            ->map(fn($b) => array_merge($this->bookPayload($b), [
                'finished_label' => $b->finished_at?->format('M Y'),
            ]))
            ->values()
            ->toArray();

        $queue = LibraryItem::where('user_id', $user->id)
            ->where('type', 'book')
            ->where('status', 'queue')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(fn($b) => array_merge($this->bookPayload($b), [
                'added' => $b->created_at->format('M'),
            ]))
            ->values()
            ->toArray();

        $abandoned = LibraryItem::where('user_id', $user->id)
            ->where('type', 'book')
            ->where('status', 'abandoned')
            ->orderBy('updated_at', 'desc')
            ->limit(10)
            ->get()
            ->map(fn($b) => $this->bookPayload($b))
            ->values()
            ->toArray();

        $totalYear = LibraryItem::where('user_id', $user->id)
            ->where('type', 'book')
            ->where('status', 'done')
            ->whereYear('finished_at', now()->year)
            ->count();

        $pagesYear = LibraryItem::where('user_id', $user->id)
            ->where('type', 'book')
            ->whereNotNull('total_pages')
            ->where('status', 'done')
            ->whereYear('finished_at', now()->year)
            ->sum('total_pages');

        return Inertia::render('Library/Index', [
            'reading'     => $reading,
            'done_recent' => $doneRecent,
            'queue'       => $queue,
            'abandoned'   => $abandoned,
            'stats'       => [
                'total_year'  => $totalYear,
                'in_progress' => count($reading),
                'pages_year'  => (int) $pagesYear,
                'queue_count' => LibraryItem::where('user_id', $user->id)->where('type', 'book')->where('status', 'queue')->count(),
            ],
        ]);
    }

    private function bookPayload(LibraryItem $b): array
    {
        return [
            'id'               => $b->id,
            'title'            => $b->title,
            'author'           => $b->author,
            'status'           => $b->status,
            'genre'            => $b->genre,
            'cover_url'        => $b->cover_url,
            'total_pages'      => $b->total_pages,
            'current_page'     => $b->current_page ?? 0,
            'rating'           => $b->rating,
            'progress_percent' => $b->progress_percent,
            'started_at'       => $b->started_at?->format('Y-m-d'),
            'finished_at'      => $b->finished_at?->format('Y-m-d'),
        ];
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validatedData($request);
        LibraryItem::create(array_merge([
            'user_id' => $request->user()->id,
            'type'    => 'book',
        ], $validated));

        return redirect()->route('library')->with('success', 'Livro adicionado.');
    }

    public function update(Request $request, LibraryItem $libraryItem): RedirectResponse
    {
        abort_if($libraryItem->user_id !== $request->user()->id, 403);

        $libraryItem->update($this->validatedData($request));

        return redirect()->route('library')->with('success', 'Livro atualizado.');
    }

    public function destroy(Request $request, LibraryItem $libraryItem): RedirectResponse
    {
        abort_if($libraryItem->user_id !== $request->user()->id, 403);

        $libraryItem->delete();

        return redirect()->route('library')->with('success', 'Livro removido.');
    }

    private function validatedData(Request $request): array
    {
        $validated = $request->validate([
            'title'        => 'required|string|max:255',
            'author'       => 'nullable|string|max:255',
            'status'       => 'required|string|in:reading,done,queue,abandoned',
            'genre'        => 'nullable|string|max:100',
            'cover_url'    => 'nullable|url|max:1024',
            'total_pages'  => 'nullable|integer|min:1|max:100000',
            'current_page' => 'nullable|integer|min:0|max:100000',
            'rating'       => 'nullable|integer|min:1|max:5',
            'started_at'   => 'nullable|date',
            'finished_at'  => 'nullable|date',
        ]);

        if (isset($validated['current_page'], $validated['total_pages'])
            && $validated['current_page'] > $validated['total_pages']) {
            throw ValidationException::withMessages([
                'current_page' => 'A página atual não pode exceder o total de páginas.',
            ]);
        }

        if (($validated['status'] ?? null) === 'done' && empty($validated['finished_at'])) {
            $tz = $request->user()->timezone ?? 'America/Sao_Paulo';
            $validated['finished_at'] = now($tz)->toDateString();
        }

        return $validated;
    }
}
