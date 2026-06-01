<?php

namespace Tests\Unit\Habits;

use App\Domains\Auth\Models\User;
use App\Domains\Habits\Models\Habit;
use App\Domains\Habits\Models\HabitCheckIn;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HabitAdherenceTest extends TestCase
{
    use RefreshDatabase;

    private function makeHabit(array $attrs, array $dates): Habit
    {
        $user  = User::factory()->create(['timezone' => 'UTC']);
        $habit = Habit::factory()->create(array_merge(['user_id' => $user->id], $attrs));
        foreach ($dates as $d) {
            HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => $d]);
        }
        return $habit->load('checkIns');
    }

    public function test_daily_adherence_counts_every_day_in_range(): void
    {
        // Intervalo de 10 dias (May 1–10), 7 check-ins → 7 de 10.
        $habit = $this->makeHabit(
            ['frequency_type' => 'daily'],
            ['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-05', '2026-05-07', '2026-05-09', '2026-05-10'],
        );

        [$expected, $done] = $habit->adherenceInRange(
            Carbon::parse('2026-05-01'), Carbon::parse('2026-05-10')
        );

        $this->assertSame(10, $expected);
        $this->assertSame(7, $done);
    }

    public function test_weekly_adherence_counts_only_expected_weekdays(): void
    {
        // weekly Seg/Qua/Sex (1,3,5). Intervalo May 4–17 (2 semanas) → 6 dias esperados.
        // Check-ins: Seg May 4, Qua May 6 (2 de 3 na semana 1); Sex May 15 (1 de 3 na semana 2).
        $habit = $this->makeHabit(
            ['frequency_type' => 'weekly', 'frequency_days' => [1, 3, 5]],
            ['2026-05-04', '2026-05-06', '2026-05-15', '2026-05-10'], // May 10 é domingo: NÃO esperado
        );

        [$expected, $done] = $habit->adherenceInRange(
            Carbon::parse('2026-05-04'), Carbon::parse('2026-05-17')
        );

        $this->assertSame(6, $expected); // 3 + 3
        $this->assertSame(3, $done);     // May 4, 6, 15 (May 10 ignorado, pois não é dia esperado)
    }

    public function test_x_per_week_adherence_measures_by_week_and_caps_at_target(): void
    {
        // x_per_week(3). Duas semanas: Apr 27–May 3 com 4 check-ins (cap em 3),
        // May 4–10 com 2 check-ins → expected 6, done min(4,3)+min(2,3) = 3+2 = 5.
        $habit = $this->makeHabit(
            ['frequency_type' => 'x_per_week', 'frequency_times' => 3],
            ['2026-04-27', '2026-04-28', '2026-04-29', '2026-05-01', '2026-05-05', '2026-05-07'],
        );

        [$expected, $done] = $habit->adherenceInRange(
            Carbon::parse('2026-04-27'), Carbon::parse('2026-05-10')
        );

        $this->assertSame(6, $expected);
        $this->assertSame(5, $done);
    }

    public function test_x_per_week_with_null_target_degrades_to_one_per_week(): void
    {
        $habit = $this->makeHabit(
            ['frequency_type' => 'x_per_week', 'frequency_times' => null],
            ['2026-05-05'],
        );

        [$expected, $done] = $habit->adherenceInRange(
            Carbon::parse('2026-05-04'), Carbon::parse('2026-05-10')
        );

        $this->assertSame(1, $expected); // fallback 1x/semana
        $this->assertSame(1, $done);
    }
}
