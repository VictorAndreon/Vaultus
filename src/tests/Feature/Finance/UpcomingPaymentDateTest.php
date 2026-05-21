<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UpcomingPaymentDateTest extends TestCase
{
    use RefreshDatabase;

    public function test_rejects_payment_with_past_due_date(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/finance/upcoming-payments', [
                'description' => 'Fatura velha',
                'amount'      => 100,
                'due_date'    => now()->subDay()->format('Y-m-d'),
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('due_date');
        $this->assertDatabaseMissing('upcoming_payments', ['description' => 'Fatura velha']);
    }

    public function test_accepts_payment_due_today(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/finance/upcoming-payments', [
                'description' => 'Hoje',
                'amount'      => 50,
                'due_date'    => now()->format('Y-m-d'),
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('upcoming_payments', ['description' => 'Hoje']);
    }

    public function test_rejects_update_setting_due_date_to_past(): void
    {
        $user    = User::factory()->create();
        $payment = $user->upcomingPayments()->create([
            'description'      => 'OK',
            'amount_encrypted' => 100,
            'due_date'         => now()->addDays(5)->format('Y-m-d'),
        ]);

        $response = $this->actingAs($user)
            ->patchJson("/finance/upcoming-payments/{$payment->id}", [
                'due_date' => now()->subDay()->format('Y-m-d'),
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('due_date');
    }
}
