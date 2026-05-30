<?php

namespace App\Domains\Reviews\Controllers;

use App\Domains\Reviews\Models\Review;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;
use Inertia\Response;

class ReviewsController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $reviews = Review::where('user_id', $user->id)
            ->orderBy('period_start', 'desc')
            ->get()
            ->map(fn($r) => $this->serialize($r))
            ->values()
            ->toArray();

        $currentWeekStart = now()->startOfWeek()->format('Y-m-d');
        $current = collect($reviews)->firstWhere('period_start_iso', $currentWeekStart);

        return Inertia::render('Reviews/Index', [
            'reviews' => $reviews,
            'current' => $current,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validatedData($request);
        Review::create(array_merge(['user_id' => $request->user()->id], $validated));

        return redirect()->route('reviews');
    }

    public function update(Request $request, int $review): RedirectResponse
    {
        $model = Review::where('user_id', $request->user()->id)
            ->where('id', $review)
            ->firstOrFail();
        $model->update($this->validatedData($request));

        return redirect()->route('reviews');
    }

    public function destroy(Request $request, int $review): RedirectResponse
    {
        Review::where('user_id', $request->user()->id)
            ->where('id', $review)
            ->firstOrFail()
            ->delete();

        return redirect()->route('reviews');
    }

    private function validatedData(Request $request): array
    {
        return $request->validate([
            'type'                   => 'required|string|in:weekly,monthly,quarterly,annual',
            'period_start'           => 'required|date',
            'period_end'             => 'required|date|after_or_equal:period_start',
            'content'                => 'required|array',
            'content.funcionou_bem'  => 'array',
            'content.pode_melhorar'  => 'array',
            'content.aprendizados'   => 'array',
            'content.proxima_semana' => 'array',
        ]);
    }

    private function serialize(Review $r): array
    {
        $weekNumber = $r->period_start->isoWeek;
        $year = $r->period_start->isoWeekYear;
        $content = $r->content ?? [];

        $filled = collect($content)->flatten(1)
            ->filter(fn($item) => is_array($item) && ($item['state'] ?? null) === 'filled')
            ->count();
        $total = collect($content)->flatten(1)->filter(fn($item) => is_array($item))->count();

        return [
            'id'               => $r->id,
            'type'             => $r->type,
            'period_start'     => $r->period_start->format('d/m/Y'),
            'period_start_iso' => $r->period_start->format('Y-m-d'),
            'period_end'       => $r->period_end->format('d/m/Y'),
            'period_end_iso'   => $r->period_end->format('Y-m-d'),
            'week_number'      => $weekNumber,
            'year'             => $year,
            'completion_pct'   => $total > 0 ? (int) round($filled / $total * 100) : 0,
            'content'          => [
                'funcionou_bem'  => $content['funcionou_bem']  ?? [],
                'pode_melhorar'  => $content['pode_melhorar']  ?? [],
                'aprendizados'   => $content['aprendizados']   ?? [],
                'proxima_semana' => $content['proxima_semana'] ?? [],
            ],
        ];
    }
}
