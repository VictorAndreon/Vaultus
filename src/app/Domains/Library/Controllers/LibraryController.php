<?php

namespace App\Domains\Library\Controllers;

use App\Domains\Library\Models\LibraryItem;
use App\Domains\Library\Services\BookCoverService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Storage;
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
                'started_label' => $b->started_at?->locale('pt_BR')->translatedFormat('M Y'),
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
                'finished_label' => $b->finished_at?->locale('pt_BR')->translatedFormat('M Y'),
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
                'added' => $b->created_at->locale('pt_BR')->translatedFormat('M'),
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

        // Ano/mês "corrente" no fuso do usuário — na virada do ano, o servidor em UTC
        // contaria os livros no ano errado (o write de finished_at já usa o fuso local).
        $tz       = $user->timezone ?? 'America/Sao_Paulo';
        $nowLocal = now($tz);

        $doneThisYear = LibraryItem::where('user_id', $user->id)
            ->where('type', 'book')
            ->where('status', 'done')
            ->whereYear('finished_at', $nowLocal->year)
            ->get(['finished_at', 'total_pages']);

        // Séries reais acumuladas por mês do ano (começam em 0 = início do ano).
        $booksSpark = [0];
        $pagesSpark = [0];
        $cumBooks = 0;
        $cumPages = 0;
        for ($m = 1; $m <= $nowLocal->month; $m++) {
            $inMonth = $doneThisYear->filter(fn($b) => (int) $b->finished_at->format('n') === $m);
            $cumBooks += $inMonth->count();
            $cumPages += (int) $inMonth->sum('total_pages');
            $booksSpark[] = $cumBooks;
            $pagesSpark[] = $cumPages;
        }

        return Inertia::render('Library/Index', [
            'reading'     => $reading,
            'done_recent' => $doneRecent,
            'queue'       => $queue,
            'abandoned'   => $abandoned,
            'stats'       => [
                'total_year'  => $doneThisYear->count(),
                'in_progress' => count($reading),
                'pages_year'  => (int) $doneThisYear->sum('total_pages'),
                'queue_count' => LibraryItem::where('user_id', $user->id)->where('type', 'book')->where('status', 'queue')->count(),
                'books_spark' => $booksSpark,
                'pages_spark' => $pagesSpark,
            ],
        ]);
    }

    public function cover(Request $request, LibraryItem $libraryItem)
    {
        abort_if($libraryItem->user_id !== $request->user()->id, 403);
        abort_if(! $libraryItem->cover_path, 404);                                       // sem capa local
        abort_if(! Storage::disk('public')->exists($libraryItem->cover_path), 404);      // registro órfão

        return Storage::disk('public')->response($libraryItem->cover_path, null, [
            'Cache-Control' => 'private, max-age=86400',
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
            'cover_url'        => $b->cover_display_url,
            'total_pages'      => $b->total_pages,
            'current_page'     => $b->current_page ?? 0,
            'rating'           => $b->rating,
            'progress_percent' => $b->progress_percent,
            'started_at'       => $b->started_at?->format('Y-m-d'),
            'finished_at'      => $b->finished_at?->format('Y-m-d'),
        ];
    }

    public function store(Request $request, BookCoverService $covers): RedirectResponse
    {
        $data = $this->validatedData($request);
        $data = array_merge($data, $this->resolveCover($request, $covers, null));

        LibraryItem::create(array_merge([
            'user_id' => $request->user()->id,
            'type'    => 'book',
        ], $data));

        return redirect()->route('library')->with('success', 'Livro adicionado.');
    }

    public function update(Request $request, LibraryItem $libraryItem, BookCoverService $covers): RedirectResponse
    {
        abort_if($libraryItem->user_id !== $request->user()->id, 403);

        $data = $this->validatedData($request);
        $data = array_merge($data, $this->resolveCover($request, $covers, $libraryItem));

        $libraryItem->update($data);

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
            'cover_file'   => 'nullable|image|mimes:jpeg,png,webp,gif|max:5120',
            'remove_cover' => 'nullable|boolean',
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

        unset($validated['cover_url'], $validated['cover_file'], $validated['remove_cover']);

        return $validated;
    }

    /**
     * Resolve a capa a partir do request, na ordem: arquivo enviado > nova URL >
     * remover > manter. Em troca/remoção, apaga o arquivo antigo.
     *
     * @return array<string, string|null>
     */
    private function resolveCover(Request $request, BookCoverService $covers, ?LibraryItem $existing): array
    {
        $old = $existing?->cover_path;

        if ($request->hasFile('cover_file')) {
            $path = $covers->fromUpload($request->file('cover_file'), $request->user()->id);
            $covers->delete($old);

            return ['cover_path' => $path, 'cover_url' => null];
        }

        $url = $request->input('cover_url');
        if (filled($url)) {
            $path = $covers->fromUrl($url, $request->user()->id);
            $covers->delete($old);

            return ['cover_path' => $path, 'cover_url' => null];
        }

        if ($request->boolean('remove_cover')) {
            $covers->delete($old);

            return ['cover_path' => null, 'cover_url' => null];
        }

        return []; // nenhum dos três → mantém a capa atual
    }
}
