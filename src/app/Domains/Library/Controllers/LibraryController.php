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
            ->map(fn($b) => [
                'id'               => $b->id,
                'title'            => $b->title,
                'author'           => $b->author,
                'progress_percent' => $b->progress_percent,
                'current_page'     => $b->current_page ?? 0,
                'total_pages'      => $b->total_pages,
                'cover_url'        => $b->cover_url,
                'started_at'       => $b->started_at?->format('M Y'),
            ])
            ->values()
            ->toArray();

        $doneRecent = LibraryItem::where('user_id', $user->id)
            ->where('type', 'book')
            ->where('status', 'done')
            ->orderBy('finished_at', 'desc')
            ->limit(8)
            ->get()
            ->map(fn($b) => [
                'id'          => $b->id,
                'title'       => $b->title,
                'author'      => $b->author,
                'rating'      => $b->rating,
                'finished_at' => $b->finished_at?->format('M Y'),
            ])
            ->values()
            ->toArray();

        $queue = LibraryItem::where('user_id', $user->id)
            ->where('type', 'book')
            ->where('status', 'queue')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(fn($b) => [
                'id'     => $b->id,
                'title'  => $b->title,
                'author' => $b->author,
                'added'  => $b->created_at->format('M'),
            ])
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
            'stats'       => [
                'total_year'    => $totalYear,
                'in_progress'   => count($reading),
                'pages_year'    => (int) $pagesYear,
                'queue_count'   => LibraryItem::where('user_id', $user->id)->where('type', 'book')->where('status', 'queue')->count(),
            ],
        ]);
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
            $validated['finished_at'] = now()->toDateString();
        }

        return $validated;
    }
}
