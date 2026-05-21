<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Services\CategoryReport;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function byCategory(Request $request, CategoryReport $report)
    {
        $tz   = $request->user()->timezone ?? 'America/Sao_Paulo';
        $now  = Carbon::now($tz);

        $validated = $request->validate([
            'from' => 'nullable|date_format:Y-m-d',
            'to'   => 'nullable|date_format:Y-m-d|after_or_equal:from',
        ]);

        $from = isset($validated['from']) ? Carbon::parse($validated['from'], $tz) : $now->copy()->startOfMonth();
        $to   = isset($validated['to'])   ? Carbon::parse($validated['to'],   $tz) : $now->copy()->endOfMonth();

        return Inertia::render('Finance/Reports', array_merge(
            $report->generate($request->user(), $from, $to),
            ['from' => $from->toDateString(), 'to' => $to->toDateString()],
        ));
    }
}
