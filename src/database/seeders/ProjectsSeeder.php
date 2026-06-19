<?php

namespace Database\Seeders;

use App\Domains\Auth\Models\User;
use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectTask;
use App\Domains\Projects\Models\Want;
use App\Domains\Projects\Services\WantPromotionService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Cobre Projects E a visão agregada de Tasks (que não tem models próprios):
 * - "feito" é derivado do NOME da coluna (ProjectColumn::nameIsDone → "conclu");
 * - inbox de Tasks = triaged_at null (fluxo de captura rápida);
 * - um dos projetos nasce promovendo um Want via WantPromotionService.
 */
class ProjectsSeeder extends Seeder
{
    private const COLUMNS = [
        ['name' => 'A fazer',      'position' => 0],
        ['name' => 'Em progresso', 'position' => 1],
        ['name' => 'Concluído',    'position' => 2],
    ];

    public function run(): void
    {
        $user = User::first();
        if (! $user) {
            return;
        }

        $tz  = $user->timezone ?? 'America/Sao_Paulo';
        $now = Carbon::now($tz);

        $this->cleanup($user);

        // ---- Wants: dois aguardando, um promovido a projeto (fluxo real) ----
        Want::create([
            'user_id' => $user->id, 'title' => 'Aprender marcenaria',
            'description' => 'Curso de fim de semana + bancada na garagem.',
            'category' => 'Hobby', 'priority' => 'medium',
        ]);
        Want::create([
            'user_id' => $user->id, 'title' => 'Montar home studio',
            'description' => 'Tratamento acústico básico e interface de áudio.',
            'category' => 'Hobby', 'priority' => 'low',
        ]);

        $wantFinancas = Want::create([
            'user_id' => $user->id, 'title' => 'Organizar finanças 2026',
            'description' => 'Consolidar contas, metas e orçamento no Vaultus.',
            'category' => 'Vida', 'priority' => 'high',
        ]);
        $financas = app(WantPromotionService::class)->promote($wantFinancas);

        $this->fillBoard($financas, $now, [
            'Concluído'    => [
                ['Mapear todas as contas', 'medium', null],
                ['Cadastrar metas no app', 'high', null],
            ],
            'Em progresso' => [
                ['Revisar orçamento por categoria', 'high', $now->copy()->setTime(9, 30)],
            ],
            'A fazer'      => [
                ['Automatizar aporte mensal', 'medium', $now->copy()->addDays(3)->setTime(10, 0)],
                ['Consolidar investimentos na corretora', 'low', null],
            ],
        ]);

        // ---- Projetos criados direto (com as mesmas colunas padrão) ----
        $vaultus = $user->projects()->create([
            'title' => 'Vaultus v2', 'status' => 'active',
            'description' => 'Evolução do app pessoal: dashboard, seeders e refinamentos.',
        ]);
        $vaultus->columns()->createMany(self::COLUMNS);
        $this->fillBoard($vaultus, $now, [
            'Concluído'    => [
                ['Heatmap de hábitos com dados reais', 'high', null],
                ['Capas de livros na dashboard', 'medium', null],
            ],
            'Em progresso' => [
                ['Seeders por domínio', 'high', $now->copy()->setTime(15, 0)],
            ],
            'A fazer'      => [
                ['Dark mode no relatório financeiro', 'medium', $now->copy()->addDays(5)->setTime(14, 0)],
                ['Exportar journal em PDF', 'low', null],
            ],
        ]);

        $vaultus->notes()->create([
            'content' => "Decisões de design ficam em docs/superpowers/specs — consultar antes de mexer em features grandes.",
        ]);
        $vaultus->links()->create([
            'title' => 'Repositório', 'url' => 'https://github.com/andreon/vaultus',
        ]);

        $mudanca = $user->projects()->create([
            'title' => 'Mudança de apartamento', 'status' => 'active',
            'description' => 'Planejamento da mudança em agosto.',
        ]);
        $mudanca->columns()->createMany(self::COLUMNS);
        $this->fillBoard($mudanca, $now, [
            'Em progresso' => [
                ['Pesquisar empresas de frete', 'high', $now->copy()->setTime(18, 0)],
            ],
            'A fazer'      => [
                ['Lista de caixas por cômodo', 'medium', null],
                ['Agendar vistoria de saída', 'high', $now->copy()->addDays(10)->setTime(11, 0)],
            ],
        ]);

        // Projeto pausado: garante variedade de status na listagem.
        $user->projects()->create([
            'title' => 'Blog pessoal', 'status' => 'paused',
            'description' => 'Retomar quando a v2 do Vaultus estabilizar.',
        ])->columns()->createMany(self::COLUMNS);

        // ---- Inbox de Tasks: captura rápida = 1ª coluna, sem triagem ----
        $first = $vaultus->columns()->orderBy('position')->first();
        foreach (['Ligar pro contador sobre o IR', 'Renovar CNH', 'Cotação do seguro residencial'] as $i => $title) {
            $vaultus->tasks()->create([
                'project_column_id' => $first->id,
                'title'             => $title,
                'priority'          => 'medium',
                'position'          => 100 + $i, // depois das tasks triadas da coluna
                'triaged_at'        => null,
            ]);
        }
    }

    /**
     * Preenche o board: tasks triadas, posição sequencial por coluna e
     * completed_at quando a coluna é de concluídos.
     */
    private function fillBoard(Project $project, Carbon $now, array $byColumn): void
    {
        $columns = $project->columns()->get()->keyBy('name');

        foreach ($byColumn as $columnName => $tasks) {
            $column = $columns[$columnName];
            $isDone = \App\Domains\Projects\Models\ProjectColumn::nameIsDone($columnName);

            foreach ($tasks as $i => [$title, $priority, $dueAt]) {
                $project->tasks()->create([
                    'project_column_id' => $column->id,
                    'title'             => $title,
                    'priority'          => $priority,
                    'position'          => $i,
                    'due_at'            => $dueAt,
                    'triaged_at'        => $now->copy()->subDays(7),
                    'completed_at'      => $isDone ? $now->copy()->subDays($i + 1) : null,
                ]);
            }
        }
    }

    /** Idempotente: zera Projects/Wants do usuário (tasks/colunas via cascade do projeto). */
    private function cleanup(User $user): void
    {
        $projectIds = Project::withTrashed()->where('user_id', $user->id)->pluck('id');

        ProjectTask::withTrashed()->whereIn('project_id', $projectIds)->forceDelete();
        Project::withTrashed()->whereIn('id', $projectIds)->get()->each(function (Project $p) {
            $p->columns()->delete();
            $p->notes()->withTrashed()->forceDelete();
            $p->links()->delete();
            $p->forceDelete();
        });
        Want::withTrashed()->where('user_id', $user->id)->forceDelete();
    }
}
