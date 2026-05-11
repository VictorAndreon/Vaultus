<?php

namespace Tests\Feature\Habits;

use App\Domains\Auth\Models\User;
use App\Domains\Habits\Models\HealthMetric;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HealthMetricTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_save_health_metrics(): void
    {
        Carbon::setTestNow('2026-05-10');
        $user = User::factory()->create(['timezone' => 'UTC']);

        $this->actingAs($user)
            ->post('/habits/health-metrics', [
                'mood'         => 4,
                'energy'       => 3,
                'sleep_hours'  => 7.5,
                'water_liters' => 2.0,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('health_metrics', [
            'user_id' => $user->id,
            'date'    => '2026-05-10',
            'mood'    => 4,
            'energy'  => 3,
        ]);
    }

    public function test_saving_metrics_twice_updates_existing(): void
    {
        Carbon::setTestNow('2026-05-10');
        $user = User::factory()->create(['timezone' => 'UTC']);
        HealthMetric::factory()->create(['user_id' => $user->id, 'date' => '2026-05-10', 'mood' => 2]);

        $this->actingAs($user)
            ->post('/habits/health-metrics', ['mood' => 5])
            ->assertRedirect();

        $this->assertDatabaseCount('health_metrics', 1);
        $this->assertDatabaseHas('health_metrics', ['user_id' => $user->id, 'mood' => 5]);
    }

    public function test_health_metrics_require_auth(): void
    {
        $this->post('/habits/health-metrics', ['mood' => 3])->assertRedirect('/login');
    }
}
