<?php

namespace Tests\Feature\Habits;

use App\Domains\Auth\Models\User;
use App\Domains\Habits\Models\Habit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class HabitCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_habits_page_requires_auth(): void
    {
        $this->get('/habits')->assertRedirect('/login');
    }

    public function test_habits_page_renders_with_correct_props(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/habits')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Habits/Index')
                ->has('habits')
                ->has('today_metrics')
                ->has('today')
            );
    }

    /**
     * Regressão: as props devem chegar SEM o envelope `data` que o Inertia
     * adiciona ao serializar JsonResource. O front lê os campos no topo
     * (habit.id, habit.frequency_type, today_metrics.mood); o wrapper deixava
     * todos undefined — id virava "undefined" na URL do check-in, a pill caía
     * no default "Semanal", o nome sumia e o drawer de edição quebrava a tela.
     */
    public function test_index_props_are_not_wrapped_in_data(): void
    {
        $user  = User::factory()->create(['timezone' => 'America/Sao_Paulo']);
        $today = \Carbon\Carbon::now('America/Sao_Paulo')->toDateString();

        $habit = Habit::factory()->create([
            'user_id'        => $user->id,
            'name'           => 'Musculação',
            'frequency_type' => 'weekly',
            'frequency_days' => [1, 3, 5],
        ]);
        $habit->checkIns()->create(['date' => $today]);

        \App\Domains\Habits\Models\HealthMetric::create([
            'user_id' => $user->id,
            'date'    => $today,
            'mood'    => 4,
        ]);

        $this->actingAs($user)
            ->get('/habits')
            ->assertInertia(fn ($page) => $page
                // hábito: campos no topo, nada sob `data`
                ->where('habits.0.id', $habit->id)
                ->where('habits.0.name', 'Musculação')
                ->where('habits.0.frequency_type', 'weekly')
                ->where('habits.0.frequency_days', [1, 3, 5])
                ->where('habits.0.checked_in_today', true)
                ->missing('habits.0.data')
                // métricas de hoje: idem
                ->where('today_metrics.mood', 4)
                ->missing('today_metrics.data')
            );
    }

    public function test_can_create_daily_habit(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/habits', [
                'name'           => 'Meditar',
                'icon'           => '🧘',
                'frequency_type' => 'daily',
                'category'       => 'Bem-estar',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('habits', [
            'user_id'        => $user->id,
            'name'           => 'Meditar',
            'frequency_type' => 'daily',
        ]);
    }

    public function test_can_create_weekly_habit(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/habits', [
                'name'           => 'Musculação',
                'frequency_type' => 'weekly',
                'frequency_days' => [1, 3, 5],
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('habits', [
            'user_id'        => $user->id,
            'frequency_type' => 'weekly',
        ]);
    }

    public function test_can_create_x_per_week_habit(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/habits', [
                'name'            => 'Correr',
                'frequency_type'  => 'x_per_week',
                'frequency_times' => 3,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('habits', [
            'user_id'         => $user->id,
            'frequency_times' => 3,
        ]);
    }

    /**
     * Reproduz o payload EXATO do HabitDrawer: os campos de frequência não usados
     * são enviados como null explícito (não omitidos). O store deve aceitá-los.
     */
    #[DataProvider('drawerPayloadProvider')]
    public function test_creates_habit_from_drawer_payload_with_explicit_nulls(string $type, array $extra): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/habits', array_merge([
                'name'            => 'Hábito Drawer',
                'icon'            => null,
                'category'        => null,
                'frequency_type'  => $type,
                'frequency_days'  => null,
                'frequency_times' => null,
            ], $extra))
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('habits', [
            'user_id'        => $user->id,
            'name'           => 'Hábito Drawer',
            'frequency_type' => $type,
        ]);
    }

    public static function drawerPayloadProvider(): array
    {
        return [
            'daily'      => ['daily', []],
            'weekly'     => ['weekly', ['frequency_days' => [1, 3, 5]]],
            'x_per_week' => ['x_per_week', ['frequency_times' => 3]],
        ];
    }

    public function test_can_update_habit(): void
    {
        $user  = User::factory()->create();
        $habit = Habit::factory()->create(['user_id' => $user->id, 'name' => 'Antigo']);

        $this->actingAs($user)
            ->patch("/habits/{$habit->id}", ['name' => 'Novo Nome'])
            ->assertRedirect();

        $this->assertDatabaseHas('habits', ['id' => $habit->id, 'name' => 'Novo Nome']);
    }

    public function test_can_soft_delete_habit(): void
    {
        $user  = User::factory()->create();
        $habit = Habit::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->delete("/habits/{$habit->id}")
            ->assertRedirect();

        $this->assertSoftDeleted('habits', ['id' => $habit->id]);
    }

    public function test_cannot_modify_other_users_habit(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $habit = Habit::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($other)
            ->patch("/habits/{$habit->id}", ['name' => 'Hackeado'])
            ->assertForbidden();
    }
}
