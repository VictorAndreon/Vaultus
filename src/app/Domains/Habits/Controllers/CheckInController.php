<?php

namespace App\Domains\Habits\Controllers;

use App\Domains\Habits\Models\Habit;
use App\Domains\Habits\Services\StreakService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class CheckInController extends Controller
{
    public function __construct(private StreakService $streakService) {}

    public function store(Request $request, Habit $habit)
    {
        abort_if($habit->user_id !== $request->user()->id, 403);

        $today = Carbon::now($request->user()->timezone)->toDateString();

        $habit->checkIns()->firstOrCreate(['date' => $today]);

        $this->streakService->recalculate($habit);

        return back();
    }

    public function destroy(Request $request, Habit $habit)
    {
        abort_if($habit->user_id !== $request->user()->id, 403);

        $today = Carbon::now($request->user()->timezone)->toDateString();

        $habit->checkIns()->whereDate('date', $today)->delete();

        $this->streakService->recalculate($habit);

        return back();
    }
}
