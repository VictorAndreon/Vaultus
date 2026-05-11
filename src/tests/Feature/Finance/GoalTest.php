<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\FinancialGoal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GoalTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_goal(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/finance/goals', [
                'name'                    => 'Viagem',
                'target_amount_encrypted' => 5000.00,
                'category'                => 'Lazer',
                'deadline'                => '2026-12-31',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('financial_goals', [
            'user_id' => $user->id,
            'name'    => 'Viagem',
        ]);
    }

    public function test_can_update_goal(): void
    {
        $user = User::factory()->create();
        $goal = FinancialGoal::create([
            'user_id'                 => $user->id,
            'name'                    => 'Viagem',
            'target_amount_encrypted' => 5000.00,
            'category'                => 'Lazer',
            'deadline'                => '2026-12-31',
        ]);

        $this->actingAs($user)
            ->patch("/finance/goals/{$goal->id}", [
                'name'         => 'Atualizado',
                'is_completed' => true,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('financial_goals', [
            'id'   => $goal->id,
            'name' => 'Atualizado',
        ]);

        $goal->refresh();
        $this->assertTrue($goal->is_completed);
    }

    public function test_can_delete_goal(): void
    {
        $user = User::factory()->create();
        $goal = FinancialGoal::create([
            'user_id'                 => $user->id,
            'name'                    => 'Fundo Emergência',
            'target_amount_encrypted' => 10000.00,
            'category'                => 'Segurança',
        ]);

        $this->actingAs($user)
            ->delete("/finance/goals/{$goal->id}")
            ->assertRedirect();

        $this->assertSoftDeleted('financial_goals', ['id' => $goal->id]);
    }

    public function test_cannot_modify_other_users_goal(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $goal = FinancialGoal::create([
            'user_id'                 => $user1->id,
            'name'                    => 'Meta do User1',
            'target_amount_encrypted' => 3000.00,
            'category'                => 'Lazer',
        ]);

        $this->actingAs($user2)
            ->patch("/finance/goals/{$goal->id}", [
                'name' => 'Hackeado',
            ])
            ->assertForbidden();
    }
}
