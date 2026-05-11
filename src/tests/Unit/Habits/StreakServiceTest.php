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
