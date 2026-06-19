<?php

namespace Database\Seeders;

use App\Domains\Auth\Models\User;
use App\Domains\Habits\Models\HealthMetric;
use App\Domains\Journal\Models\JournalEntry;
use App\Domains\Journal\Models\JournalPrompt;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Entradas com HTML do editor TipTap (h2/p/ul — ver .journal-prose), uma por
 * dia no máximo (unique user_id+date) e vinculadas à HealthMetric do dia —
 * o mood chart do Journal lê healthMetric->mood. Rodar após o HabitsSeeder,
 * que cria as métricas recentes (aqui só completamos as faltantes).
 */
class JournalSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();
        if (! $user) {
            return;
        }

        $tz    = $user->timezone ?? 'America/Sao_Paulo';
        $today = Carbon::today($tz);

        JournalEntry::withTrashed()->where('user_id', $user->id)->forceDelete();
        JournalPrompt::where('user_id', $user->id)->delete();

        $prompts = [
            'O que fez hoje valer a pena?',
            'O que aprendi hoje?',
            'O que posso melhorar amanhã?',
            'Pelo que sou grato hoje?',
        ];
        foreach ($prompts as $i => $content) {
            JournalPrompt::create([
                'user_id' => $user->id, 'content' => $content,
                'is_active' => true, 'position' => $i,
            ]);
        }

        // [offset em dias, título, HTML, tags, mood (1–5) p/ a métrica do dia]
        $entries = [
            [0, 'Dia de foco', '<p>Manhã rendeu muito — fechei a revisão da dashboard antes do almoço.</p><h2>Destaques</h2><ul><li>Treino feito cedo</li><li>Leitura no fim do dia</li></ul>', ['foco', 'trabalho'], 4],
            [1, 'Recomeço', '<p>Dormi mal, mas consegui manter a rotina mínima. <strong>Consistência sobre intensidade.</strong></p>', ['rotina'], 3],
            [2, null, '<p>Caminhada longa no parque com música nova. Ideias soltas sobre o projeto de marcenaria.</p>', ['lazer', 'ideias'], 5],
            [4, 'Semana apertada', '<p>Muitas reuniões. Quase nenhum tempo de deep work.</p><h2>Para ajustar</h2><ul><li>Bloquear manhãs na agenda</li><li>Responder e-mails só à tarde</li></ul>', ['trabalho'], 2],
            [5, null, '<p>Jantar com a família. Dia leve, sem culpa de não produzir.</p>', ['família'], 5],
            [7, 'Revisão da semana', '<p>Fechei a revisão semanal: hábitos acima de 80%, finanças em dia.</p>', ['reflexão', 'revisão'], 4],
            [9, null, '<p>Li dois capítulos de <em>Hábitos Atômicos</em>. A ideia de identidade antes de resultado segue ecoando.</p>', ['leitura'], 4],
            [12, 'Dia difícil', '<p>Ansiedade alta de manhã. Meditar ajudou a destravar o resto do dia.</p>', ['saúde-mental'], 2],
            [14, null, '<p>Organizei o orçamento do mês e agendei os aportes das metas.</p>', ['finanças'], 3],
            [17, 'Planejamento', '<p>Esbocei os próximos passos da mudança de apartamento.</p><ul><li>Pesquisar fretes</li><li>Lista de caixas por cômodo</li></ul>', ['planejamento', 'casa'], 4],
        ];

        foreach ($entries as [$offset, $title, $html, $tags, $mood]) {
            $date = $today->copy()->subDays($offset)->toDateString();

            // Métrica do dia: aproveita a do HabitsSeeder se existir; senão cria
            // uma coerente com o humor da entrada.
            $metric = HealthMetric::firstOrCreate(
                ['user_id' => $user->id, 'date' => $date],
                ['mood' => $mood, 'energy' => max(1, $mood - 1), 'sleep_hours' => 6 + $mood * 0.4],
            );

            JournalEntry::create([
                'user_id'          => $user->id,
                'date'             => $date,
                'title'            => $title,
                'content'          => $html,
                'tags'             => $tags,
                'health_metric_id' => $metric->id,
            ]);
        }
    }
}
