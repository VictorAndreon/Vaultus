<?php

namespace Tests\Feature\Habits;

use App\Domains\Auth\Models\User;
use App\Domains\Habits\Models\Habit;
use App\Domains\Habits\Models\HabitCheckIn;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckInTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_check_in_today(): void
    {
        Carbon::setTestNow('2026-05-10');
        $user  = User::factory()->create(['timezone' => 'UTC']);
        $habit = Habit::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->post("/habits/{$habit->id}/check-in")
            ->assertRedirect();

        $this->assertDatabaseHas('habit_check_ins', [
            'habit_id' => $habit->id,
            'date'     => '2026-05-10',
        ]);
    }

    public function test_can_remove_checkin_today(): void
    {
        Carbon::setTestNow('2026-05-10');
        $user  = User::factory()->create(['timezone' => 'UTC']);
        $habit = Habit::factory()->create(['user_id' => $user->id]);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-10']);

        $this->actingAs($user)
            ->delete("/habits/{$habit->id}/check-in")
            ->assertRedirect();

        $this->assertDatabaseMissing('habit_check_ins', [
            'habit_id' => $habit->id,
            'date'     => '2026-05-10',
        ]);
    }

    public function test_checkin_updates_streak(): void
    {
        Carbon::setTestNow('2026-05-10');
        $user  = User::factory()->create(['timezone' => 'UTC']);
        $habit = Habit::factory()->create(['user_id' => $user->id, 'current_streak' => 0]);

        $this->actingAs($user)->post("/habits/{$habit->id}/check-in");

        $this->assertEquals(1, $habit->fresh()->current_streak);
    }

    public function test_cannot_checkin_other_users_habit(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $habit = Habit::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($other)
            ->post("/habits/{$habit->id}/check-in")
            ->assertForbidden();
    }
}
