<?php

namespace Database\Seeders;

use App\Domains\Auth\Models\User;
use App\Domains\Reviews\Models\Review;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class ReviewsSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();
        if (! $user) return;

        // Idempotente: re-rodar não duplica revisões.
        Review::withTrashed()->where('user_id', $user->id)->forceDelete();

        $weeks = [
            // Semana atual — em andamento (alguns itens vazios)
            [
                'offset_weeks' => 0,
                'content' => [
                    'funcionou_bem'  => [
                        ['text' => 'Fechei a Fase 1 do design system Vaultus',  'state' => 'filled'],
                        ['text' => 'Manhãs de leitura com café',                  'state' => 'filled'],
                    ],
                    'pode_melhorar'  => [
                        ['text' => 'Dormir antes da meia-noite',                  'state' => 'failed'],
                        ['text' => 'Menos screen time depois do jantar',          'state' => 'neutral'],
                    ],
                    'aprendizados'   => [
                        ['text' => 'OKLCH é um superpoder pra design systems'],
                        ['text' => 'Subagent-driven dev escala bem em planos densos'],
                    ],
                    'proxima_semana' => [
                        ['text' => 'Começar Fase 3 dos stubs',                    'state' => 'empty'],
                        ['text' => 'Reavaliar metas de Q2',                       'state' => 'empty'],
                    ],
                ],
            ],
            // Semana passada
            [
                'offset_weeks' => -1,
                'content' => [
                    'funcionou_bem'  => [['text' => 'Migrei todas as telas para o vocabulário editorial', 'state' => 'filled']],
                    'pode_melhorar'  => [['text' => 'Mais pausas entre tasks intensas', 'state' => 'failed']],
                    'aprendizados'   => [['text' => 'Decomposição clara economiza horas de debug']],
                    'proxima_semana' => [['text' => 'Implementar Fase 1 do DS', 'state' => 'filled']],
                ],
            ],
            // 2 semanas atrás
            [
                'offset_weeks' => -2,
                'content' => [
                    'funcionou_bem'  => [['text' => 'Brainstorm fechou plano coeso da Fase 1+2+3', 'state' => 'filled']],
                    'pode_melhorar'  => [['text' => 'Documentar decisões assim que tomar', 'state' => 'neutral']],
                    'aprendizados'   => [['text' => 'O PDF inicial codifica princípios — não detalhes']],
                    'proxima_semana' => [['text' => 'Migrar telas existentes', 'state' => 'filled']],
                ],
            ],
        ];

        foreach ($weeks as $w) {
            $start = Carbon::now()->addWeeks($w['offset_weeks'])->startOfWeek();
            $end   = $start->copy()->endOfWeek();

            Review::create([
                'user_id'      => $user->id,
                'type'         => 'weekly',
                'period_start' => $start,
                'period_end'   => $end,
                'content'      => $w['content'],
            ]);
        }
    }
}
