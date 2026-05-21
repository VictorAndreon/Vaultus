<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GoalStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_status_is_concluida_when_progress_reaches_target(): void
    {
        $user   = User::factory()->create();
        $source = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 10000]);
        $goal   = $user->financialGoals()->create([
            'name'                    => 'Concluível',
            'target_amount_encrypted' => 1000,
            'deadline'                => now()->addYear()->endOfMonth()->toDateString(),
        ]);

        $this->actingAs($user)->post("/finance/goals/{$goal->id}/deposit", [
            'amount'     => 1000,
            'account_id' => $source->id,
        ]);

        $this->assertSame('concluida', $goal->fresh()->status);
    }

    public function test_status_is_atrasado_when_deadline_is_in_the_past_and_not_done(): void
    {
        $user = User::factory()->create();
        $goal = $user->financialGoals()->create([
            'name'                    => 'Esquecida',
            'target_amount_encrypted' => 5000,
            'deadline'                => now()->subMonth()->endOfMonth()->toDateString(),
        ]);

        $this->assertSame('atrasado', $goal->fresh()->status);
    }

    public function test_status_is_no_prazo_when_no_deadline_set(): void
    {
        $user = User::factory()->create();
        $goal = $user->financialGoals()->create([
            'name'                    => 'Sem prazo',
            'target_amount_encrypted' => 5000,
        ]);

        $this->assertSame('no-prazo', $goal->fresh()->status);
    }

    public function test_status_is_atencao_when_monthly_amount_below_suggested(): void
    {
        $user = User::factory()->create();
        // Precisa juntar 1200 em 2 meses = 600/mês. Aporta só 100/mês → atenção.
        $goal = $user->financialGoals()->create([
            'name'                     => 'Aperto',
            'target_amount_encrypted'  => 1200,
            'monthly_amount_encrypted' => 100,
            'deadline'                 => now()->addMonths(2)->endOfMonth()->toDateString(),
        ]);

        $this->assertSame('atencao', $goal->fresh()->status);
    }

    public function test_status_is_no_prazo_when_monthly_amount_meets_suggested(): void
    {
        $user = User::factory()->create();
        // 600 em 6 meses = 100/mês. Aporta 120/mês → no prazo.
        $goal = $user->financialGoals()->create([
            'name'                     => 'Tranquila',
            'target_amount_encrypted'  => 600,
            'monthly_amount_encrypted' => 120,
            'deadline'                 => now()->addMonths(6)->endOfMonth()->toDateString(),
        ]);

        $this->assertSame('no-prazo', $goal->fresh()->status);
    }
}
