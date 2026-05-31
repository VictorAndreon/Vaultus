<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Services\CategoryReport;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function exportCsv(Request $request, CategoryReport $report): StreamedResponse
    {
        $tz  = $request->user()->timezone ?? 'America/Sao_Paulo';
        $now = Carbon::now($tz);

        $validated = $request->validate([
            'from' => 'nullable|date_format:Y-m-d',
            'to'   => 'nullable|date_format:Y-m-d|after_or_equal:from',
            'type' => 'nullable|in:income,expense',
        ]);

        $from = isset($validated['from']) ? Carbon::parse($validated['from'], $tz) : $now->copy()->startOfMonth();
        $to   = isset($validated['to'])   ? Carbon::parse($validated['to'],   $tz) : $now->copy()->endOfMonth();
        $type = $validated['type'] ?? 'expense';

        $data = $report->generate($request->user(), $from, $to, $type);

        $filename = sprintf('relatorio_%s_%s_%s.csv', $type, $from->format('Y-m-d'), $to->format('Y-m-d'));

        return new StreamedResponse(function () use ($data) {
            $out = fopen('php://output', 'w');
            // BOM UTF-8 para o Excel abrir com acentos corretos
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Categoria', 'Lançamentos', 'Total (R$)', '% do total']);
            foreach ($data['categories'] as $row) {
                fputcsv($out, [
                    $row['name'],
                    $row['count'],
                    number_format($row['total'], 2, ',', '.'),
                    $row['pct'] . '%',
                ]);
            }
            fclose($out);
        }, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function byCategory(Request $request, CategoryReport $report)
    {
        $tz   = $request->user()->timezone ?? 'America/Sao_Paulo';
        $now  = Carbon::now($tz);

        $validated = $request->validate([
            'from'    => 'nullable|date_format:Y-m-d',
            'to'      => 'nullable|date_format:Y-m-d|after_or_equal:from',
            'type'    => 'nullable|in:income,expense',
            'compare' => 'nullable|boolean',
        ]);

        $from    = isset($validated['from']) ? Carbon::parse($validated['from'], $tz) : $now->copy()->startOfMonth();
        $to      = isset($validated['to'])   ? Carbon::parse($validated['to'],   $tz) : $now->copy()->endOfMonth();
        $type    = $validated['type'] ?? 'expense';
        $compare = (bool) ($validated['compare'] ?? false);

        return Inertia::render('Finance/Reports', array_merge(
            $report->generate($request->user(), $from, $to, $type, $compare),
            ['from' => $from->toDateString(), 'to' => $to->toDateString()],
        ));
    }
}
