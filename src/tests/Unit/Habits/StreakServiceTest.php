<?php

namespace Tests\Unit\Habits;

use App\Domains\Auth\Models\User;
use App\Domains\Habits\Models\Habit;
use App\Domains\Habits\Models\HabitCheckIn;
use App\Domains\Habits\Services\StreakService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StreakServiceTest extends TestCase
{
    use RefreshDatabase;

    private StreakService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new StreakService();
    }

    public function test_daily_streak_with_continuous_checkins(): void
    {
        Carbon::setTestNow('2026-05-10'); // domingo
        $user = User::factory()->create(['timezone' => 'UTC']);
        $habit = Habit::factory()->create(['user_id' => $user->id, 'frequency_type' => 'daily']);

        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-08']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-09']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-10']);

        $this->service->recalculate($habit);
        $habit->refresh();

        $this->assertEquals(3, $habit->current_streak);
        $this->assertEquals(3, $habit->best_streak);
    }

    public function test_daily_streak_broken_in_middle(): void
    {
        Carbon::setTestNow('2026-05-10');
        $user = User::factory()->create(['timezone' => 'UTC']);
        $habit = Habit::factory()->create(['user_id' => $user->id, 'frequency_type' => 'daily']);

        // May 7, 8, 10 — sem May 9
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-07']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-08']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-10']);

        $this->service->recalculate($habit);
        $habit->refresh();

        $this->assertEquals(1, $habit->current_streak);
    }

    public function test_daily_streak_does_not_penalize_today_if_not_done(): void
    {
        Carbon::setTestNow('2026-05-10');
        $user = User::factory()->create(['timezone' => 'UTC']);
        $habit = Habit::factory()->create(['user_id' => $user->id, 'frequency_type' => 'daily']);

        // May 8, 9 — sem check-in hoje ainda
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-08']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-09']);

        $this->service->recalculate($habit);
        $habit->refresh();

        $this->assertEquals(2, $habit->current_streak);
    }

    public function test_weekly_streak_with_specific_days(): void
    {
        Carbon::setTestNow('2026-05-10'); // domingo
        $user = User::factory()->create(['timezone' => 'UTC']);
        // Seg=1, Qua=3, Sex=5 em Carbon (0=dom)
        $habit = Habit::factory()->weekly([1, 3, 5])->create(['user_id' => $user->id]);

        // Semana Apr 27 - May 3: Seg Apr 27, Qua Apr 29, Sex May 1
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-04-27']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-04-29']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-01']);
        // Semana May 4 - May 10: Seg May 4, Qua May 6, Sex May 8
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-04']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-06']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-08']);

        $this->service->recalculate($habit);
        $habit->refresh();

        $this->assertEquals(6, $habit->current_streak);
    }

    public function test_x_per_week_streak_counts_complete_past_weeks(): void
    {
        Carbon::setTestNow('2026-05-10'); // domingo — semana May 4-10
        $user = User::factory()->create(['timezone' => 'UTC']);
        $habit = Habit::factory()->xPerWeek(3)->create(['user_id' => $user->id]);

        // Semana Apr 27 - May 3: 3 check-ins (completa)
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-04-27']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-04-29']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-01']);
        // Semana atual May 4-10: 2 check-ins (incompleta, não deve contar)
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-05']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-07']);

        $this->service->recalculate($habit);
        $habit->refresh();

        $this->assertEquals(1, $habit->current_streak);
    }

    public function test_x_per_week_counts_current_week_when_goal_already_met(): void
    {
        Carbon::setTestNow('2026-05-10'); // domingo — semana May 4-10
        $user = User::factory()->create(['timezone' => 'UTC']);
        $habit = Habit::factory()->xPerWeek(3)->create(['user_id' => $user->id]);

        // Semana atual May 4-10: 3 check-ins (meta JÁ cumprida)
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-04']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-06']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-08']);
        // Semana anterior Apr 27 - May 3: 3 check-ins
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-04-27']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-04-29']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-01']);

        $this->service->recalculate($habit);
        $habit->refresh();

        // Cumprir a meta da semana corrente deve contar imediatamente.
        $this->assertEquals(2, $habit->current_streak);
    }

    public function test_x_per_week_streak_respects_user_timezone_boundary(): void
    {
        // Em fuso negativo (−03:00), a fronteira da semana ficava deslocada e
        // excluía o check-in de segunda-feira (início da semana), derrubando a
        // contagem de 3 para 2 e zerando o streak.
        Carbon::setTestNow('2026-05-31 12:00:00'); // domingo (UTC)
        $user  = User::factory()->create(['timezone' => 'America/Sao_Paulo']);
        $habit = Habit::factory()->xPerWeek(3)->create(['user_id' => $user->id]);

        // Semana atual May 25 (seg) – 31 (dom): 3 check-ins, incluindo a segunda.
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-25']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-27']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-29']);

        $this->service->recalculate($habit);

        $this->assertSame(1, $habit->fresh()->current_streak);
    }

    public function test_x_per_week_with_null_frequency_times_does_not_inflate_streak(): void
    {
        Carbon::setTestNow('2026-05-10');
        $user = User::factory()->create(['timezone' => 'UTC']);
        // Estado inválido (ex.: vindo de um update): x_per_week sem frequency_times.
        $habit = Habit::factory()->create([
            'user_id'         => $user->id,
            'frequency_type'  => 'x_per_week',
            'frequency_times' => null,
        ]);

        // 1 check-in na semana atual e outro há ~4 semanas, com semanas VAZIAS no meio.
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-04']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-04-06']);

        $this->service->recalculate($habit);
        $habit->refresh();

        // Sem alvo válido, semanas vazias NÃO podem contar como cumpridas.
        // Com fallback de 1x/semana: só a semana atual conta; a anterior está vazia → quebra.
        $this->assertEquals(1, $habit->current_streak);
    }

    public function test_recalculate_works_on_habit_created_without_streak_defaults(): void
    {
        Carbon::setTestNow('2026-05-10');
        $user = User::factory()->create(['timezone' => 'UTC']);

        // Cria como o controller/seeder: sem current_streak/best_streak explícitos.
        // O objeto em memória teria esses campos nulos sem defaults no model.
        // Com streak resultante 0, max(null, 0) === null em PHP → viola NOT NULL.
        $habit = $user->habits()->create([
            'name'            => 'Novo Hábito',
            'frequency_type'  => 'x_per_week',
            'frequency_times' => 3,
        ]);
        // Apenas 1 check-in na semana corrente: meta (3) não cumprida → streak 0.
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-04']);

        $this->service->recalculate($habit);

        $fresh = $habit->fresh();
        $this->assertSame(0, $fresh->current_streak);
        $this->assertSame(0, $fresh->best_streak);
    }

    public function test_best_streak_never_decreases(): void
    {
        Carbon::setTestNow('2026-05-10');
        $user = User::factory()->create(['timezone' => 'UTC']);
        $habit = Habit::factory()->create([
            'user_id'        => $user->id,
            'frequency_type' => 'daily',
            'best_streak'    => 10,
        ]);

        // Apenas 1 check-in hoje
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-10']);

        $this->service->recalculate($habit);
        $habit->refresh();

        $this->assertEquals(1, $habit->current_streak);
        $this->assertEquals(10, $habit->best_streak);
    }
}
