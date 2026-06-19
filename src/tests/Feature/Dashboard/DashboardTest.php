<?php

namespace Tests\Feature\Dashboard;

use App\Domains\Auth\Models\User;
use App\Domains\Dashboard\Services\DashboardAggregator;
use App\Domains\Habits\Models\Habit;
use App\Domains\Habits\Models\HabitCheckIn;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_habit_rate_is_coherent_and_never_exceeds_100(): void
    {
        Carbon::setTestNow('2026-05-10'); // domingo; mês corrente May 1–10
        $user = User::factory()->create(['timezone' => 'UTC']);

        // Hábito esperado hoje — mantém expectedToday > 0 (a fórmula antiga
        // dividia por isso e poderia estourar 100%).
        Habit::factory()->create(['user_id' => $user->id, 'frequency_type' => 'daily']);

        // Dois hábitos "só segunda", mas com check-in em TODOS os 10 dias do mês.
        // Como hoje é domingo, nenhum entra em expectedToday: a fórmula antiga
        // (20 check-ins / (10 dias × 1 esperado)) daria 200%.
        foreach (range(1, 2) as $i) {
            $h = Habit::factory()->weekly([1])->create(['user_id' => $user->id]);
            foreach (range(1, 10) as $day) {
                HabitCheckIn::factory()->create([
                    'habit_id' => $h->id,
                    'date'     => sprintf('2026-05-%02d', $day),
                ]);
            }
        }

        $stats = (new DashboardAggregator())->getStats($user);

        $this->assertLessThanOrEqual(100, $stats['habit_rate']);
        $this->assertGreaterThanOrEqual(0, $stats['habit_rate']);
    }

    public function test_dashboard_requires_auth(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_authenticated_user_sees_dashboard(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard/Index')
                ->has('stats')
                ->has('stats.tasks_due_today')
                ->has('tasks_today')
                ->has('projects')
                ->has('financial_goals')
                ->has('wealth_chart')
                ->has('wealth_chart.labels')
                ->has('wealth_chart.data')
                ->has('reading')
            );
    }

    public function test_library_item_progress_percent_calculates_correctly(): void
    {
        $user = User::factory()->create();

        \App\Domains\Library\Models\LibraryItem::create([
            'user_id'      => $user->id,
            'type'         => 'book',
            'title'        => 'Test Book',
            'status'       => 'reading',
            'total_pages'  => 200,
            'current_page' => 50,
        ]);

        $item = $user->libraryItems()->first();

        $this->assertEquals(25, $item->progress_percent);
    }

    public function test_get_tasks_today_returns_tasks_due_today(): void
    {
        $user    = User::factory()->create();
        $project = \App\Domains\Projects\Models\Project::create([
            'user_id' => $user->id, 'title' => 'P1', 'status' => 'active',
        ]);
        $col = \App\Domains\Projects\Models\ProjectColumn::create([
            'project_id' => $project->id, 'name' => 'A fazer', 'position' => 1,
        ]);
        \App\Domains\Projects\Models\ProjectTask::create([
            'project_id'        => $project->id,
            'project_column_id' => $col->id,
            'title'             => 'Task hoje',
            'priority'          => 'high',
            'due_at'            => now()->setTime(9, 0),
            'position'          => 1,
        ]);

        $aggregator = new \App\Domains\Dashboard\Services\DashboardAggregator();
        $result = $aggregator->getTasksToday($user);

        $this->assertCount(1, $result);
        $this->assertEquals('Task hoje', $result[0]['title']);
        $this->assertEquals('P1', $result[0]['project_name']);
        $this->assertFalse($result[0]['is_done']);
    }

    public function test_get_tasks_today_marks_done_column_tasks(): void
    {
        $user    = User::factory()->create();
        $project = \App\Domains\Projects\Models\Project::create([
            'user_id' => $user->id, 'title' => 'P1', 'status' => 'active',
        ]);
        $done = \App\Domains\Projects\Models\ProjectColumn::create([
            'project_id' => $project->id, 'name' => 'Done', 'position' => 3,
        ]);
        \App\Domains\Projects\Models\ProjectTask::create([
            'project_id'        => $project->id,
            'project_column_id' => $done->id,
            'title'             => 'Feita',
            'due_at'            => now(),
            'position'          => 1,
        ]);

        $aggregator = new \App\Domains\Dashboard\Services\DashboardAggregator();
        $result = $aggregator->getTasksToday($user);

        $this->assertTrue($result[0]['is_done']);
    }

    public function test_get_active_projects_calculates_progress(): void
    {
        $user    = User::factory()->create();
        $project = \App\Domains\Projects\Models\Project::create([
            'user_id' => $user->id, 'title' => 'Proj', 'status' => 'active',
        ]);
        $todo = \App\Domains\Projects\Models\ProjectColumn::create([
            'project_id' => $project->id, 'name' => 'A fazer', 'position' => 1,
        ]);
        $done = \App\Domains\Projects\Models\ProjectColumn::create([
            'project_id' => $project->id, 'name' => 'Done', 'position' => 2,
        ]);
        \App\Domains\Projects\Models\ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $done->id,
            'title' => 'T1', 'position' => 1,
        ]);
        \App\Domains\Projects\Models\ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $todo->id,
            'title' => 'T2', 'position' => 2,
        ]);

        $aggregator = new \App\Domains\Dashboard\Services\DashboardAggregator();
        $result = $aggregator->getActiveProjects($user);

        $this->assertCount(1, $result);
        $this->assertEquals(50, $result[0]['progress_percent']);
        $this->assertEquals(1, $result[0]['tasks_done']);
        $this->assertEquals(2, $result[0]['tasks_total']);
    }

    public function test_get_financial_goals_returns_non_archived(): void
    {
        $user = User::factory()->create();
        \App\Domains\Finance\Models\FinancialGoal::create([
            'user_id'                   => $user->id,
            'name'                      => 'Reserva',
            'target_amount_encrypted'   => '100000',
            'category'                  => 'Segurança',
            'is_archived'               => false,
            'is_completed'              => false,
        ]);
        \App\Domains\Finance\Models\FinancialGoal::create([
            'user_id'                   => $user->id,
            'name'                      => 'Arquivada',
            'target_amount_encrypted'   => '5000',
            'is_archived'               => true,
            'is_completed'              => false,
        ]);

        $aggregator = new \App\Domains\Dashboard\Services\DashboardAggregator();
        $result = $aggregator->getFinancialGoals($user);

        $this->assertCount(1, $result);
        $this->assertEquals('Reserva', $result[0]['name']);
    }

    public function test_get_wealth_chart_returns_13_months(): void
    {
        $user = User::factory()->create();

        $aggregator = new \App\Domains\Dashboard\Services\DashboardAggregator();
        $result = $aggregator->getWealthChart($user);

        $this->assertArrayHasKey('labels', $result);
        $this->assertArrayHasKey('data', $result);
        $this->assertCount(13, $result['labels']);
        $this->assertCount(13, $result['data']);
    }

    public function test_get_reading_returns_books_in_reading_status(): void
    {
        $user = User::factory()->create();
        \App\Domains\Library\Models\LibraryItem::create([
            'user_id' => $user->id, 'type' => 'book', 'title' => 'Livro A',
            'status' => 'reading', 'total_pages' => 300, 'current_page' => 100,
        ]);
        \App\Domains\Library\Models\LibraryItem::create([
            'user_id' => $user->id, 'type' => 'book', 'title' => 'Livro B',
            'status' => 'done',
        ]);

        $aggregator = new \App\Domains\Dashboard\Services\DashboardAggregator();
        $result = $aggregator->getReading($user);

        $this->assertCount(1, $result);
        $this->assertEquals('Livro A', $result[0]['title']);
        $this->assertEquals(33, $result[0]['progress_percent']);
    }

    public function test_habits_heatmap_returns_12_weekly_adherence_values_per_habit(): void
    {
        Carbon::setTestNow('2026-06-10'); // quarta — semana atual Jun 8–14
        $user  = User::factory()->create(['timezone' => 'UTC']);
        $habit = Habit::factory()->create(['user_id' => $user->id, 'frequency_type' => 'daily']);

        // Semana passada (Jun 1–7) completa; semana atual sem nada até quarta.
        foreach (range(1, 7) as $day) {
            HabitCheckIn::factory()->create([
                'habit_id' => $habit->id,
                'date'     => sprintf('2026-06-%02d', $day),
            ]);
        }

        $rows = (new DashboardAggregator())->getHabitsHeatmap($user);

        $this->assertCount(1, $rows);
        $this->assertSame($habit->name, $rows[0]['label']);
        $this->assertCount(12, $rows[0]['values']);
        $this->assertEquals(1.0, $rows[0]['values'][10]);  // semana passada 7/7
        $this->assertEquals(0.0, $rows[0]['values'][11]);  // semana atual 0/3 (seg–qua)
        $this->assertEquals(0.0, $rows[0]['values'][0]);   // 12 semanas atrás, sem check-ins
    }

    public function test_habits_heatmap_uses_user_timezone_for_current_week(): void
    {
        // 01:30 UTC de segunda = 22:30 de domingo em São Paulo — a semana atual
        // do usuário ainda é Jun 1–7; em UTC seria Jun 8–14 e o valor cairia p/ 0.
        Carbon::setTestNow(Carbon::parse('2026-06-08 01:30:00', 'UTC'));
        $user  = User::factory()->create(['timezone' => 'America/Sao_Paulo']);
        $habit = Habit::factory()->weekly([0])->create(['user_id' => $user->id]); // só domingo

        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-06-07']);

        $rows = (new DashboardAggregator())->getHabitsHeatmap($user);

        $this->assertEquals(1.0, $rows[0]['values'][11]);
    }

    public function test_habits_heatmap_x_per_week_is_fraction_of_weekly_target(): void
    {
        Carbon::setTestNow('2026-06-10');
        $user  = User::factory()->create(['timezone' => 'UTC']);
        $habit = Habit::factory()->create([
            'user_id' => $user->id, 'frequency_type' => 'x_per_week', 'frequency_times' => 4,
        ]);

        // Semana passada (Jun 1–7): 2 de 4 → 0.5
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-06-02']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-06-04']);

        $rows = (new DashboardAggregator())->getHabitsHeatmap($user);

        $this->assertEquals(0.5, $rows[0]['values'][10]);
    }

    public function test_journal_recent_reads_mood_from_linked_health_metric(): void
    {
        $user   = User::factory()->create();
        $metric = \App\Domains\Habits\Models\HealthMetric::create([
            'user_id' => $user->id, 'date' => '2026-06-10', 'mood' => 5,
        ]);
        $user->journalEntries()->create([
            'date' => '2026-06-10', 'content' => '<p>Ótimo dia.</p>',
            'tags' => [], 'health_metric_id' => $metric->id,
        ]);

        $result = (new DashboardAggregator())->getJournalRecent($user);

        $this->assertEquals('Realizado', $result[0]['mood']);
    }

    public function test_get_reading_exposes_display_url_for_local_covers(): void
    {
        $user = User::factory()->create();
        $item = \App\Domains\Library\Models\LibraryItem::create([
            'user_id' => $user->id, 'type' => 'book', 'title' => 'Com capa local',
            'status' => 'reading', 'cover_path' => 'library/covers/abc.webp',
        ]);

        $result = (new DashboardAggregator())->getReading($user);

        $this->assertEquals(route('library.cover', $item->id), $result[0]['cover_url']);
    }
}
