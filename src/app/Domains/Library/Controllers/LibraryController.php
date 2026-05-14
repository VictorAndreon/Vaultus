<?php

namespace App\Domains\Library\Controllers;

use App\Domains\Library\Models\LibraryItem;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
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
}
