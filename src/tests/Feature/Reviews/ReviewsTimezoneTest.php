<?php

namespace Tests\Feature\Reviews;

use App\Domains\Auth\Models\User;
use App\Domains\Reviews\Models\Review;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReviewsTimezoneTest extends TestCase
{
    use RefreshDatabase;

    public function test_current_week_uses_user_timezone_not_utc(): void
    {
        // A semana (no Carbon do app) começa no domingo. Na fronteira sábado→domingo:
        // UTC: domingo 31/05 01:00 → semana começa em 31/05.
        // São Paulo (UTC-3): sábado 30/05 22:00 → semana começa em 24/05.
        $user = User::factory()->create(['timezone' => 'America/Sao_Paulo']);

        Review::create([
            'user_id'      => $user->id,
            'type'         => 'weekly',
            'period_start' => '2026-05-24',
            'period_end'   => '2026-05-30',
            'content'      => [],
        ]);

        $this->travelTo(\Illuminate\Support\Carbon::parse('2026-05-31 01:00:00', 'UTC'), function () use ($user) {
            $this->actingAs($user)
                ->get('/reviews')
                ->assertInertia(fn($page) => $page
                    ->where('current.period_start_iso', '2026-05-24'));
        });
    }
}
