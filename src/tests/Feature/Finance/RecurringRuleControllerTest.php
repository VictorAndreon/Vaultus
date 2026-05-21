<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\RecurringRule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecurringRuleControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_renders_with_rules_and_accounts(): void
    {
        $user = User::factory()->create();
        $acc  = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking']);
        $user->recurringRules()->create([
            'account_id'       => $acc->id,
            'type'             => 'expense',
            'amount_encrypted' => 1200,
            'description'      => 'Aluguel',
            'day_of_month'     => 5,
            'starts_on'        => '2026-01-01',
        ]);

        $this->actingAs($user)
            ->get('/finance/recurring')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Finance/Recurring')
                ->has('rules', 1)
                ->where('rules.0.description', 'Aluguel')
                ->where('rules.0.account_name', $acc->name)
                ->has('accounts')
            );
    }

    public function test_can_create_recurring_rule(): void
    {
        $user = User::factory()->create();
        $acc  = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking']);

        $this->actingAs($user)
            ->post('/finance/recurring', [
                'account_id'       => $acc->id,
                'type'             => 'expense',
                'amount_encrypted' => 99.90,
                'description'      => 'Netflix',
                'category'         => 'Assinaturas',
                'day_of_month'     => 10,
                'starts_on'        => '2026-01-01',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('recurring_rules', ['description' => 'Netflix']);
    }

    public function test_can_pause_rule_by_updating_is_active(): void
    {
        $user = User::factory()->create();
        $acc  = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking']);
        $rule = $user->recurringRules()->create([
            'account_id'       => $acc->id,
            'type'             => 'expense',
            'amount_encrypted' => 50,
            'description'      => 'X',
            'day_of_month'     => 1,
            'starts_on'        => '2026-01-01',
            'is_active'        => true,
        ]);

        $this->actingAs($user)
            ->patch("/finance/recurring/{$rule->id}", ['is_active' => false])
            ->assertRedirect();

        $this->assertFalse($rule->fresh()->is_active);
    }

    public function test_can_delete_rule(): void
    {
        $user = User::factory()->create();
        $acc  = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking']);
        $rule = $user->recurringRules()->create([
            'account_id'       => $acc->id,
            'type'             => 'expense',
            'amount_encrypted' => 50,
            'description'      => 'X',
            'day_of_month'     => 1,
            'starts_on'        => '2026-01-01',
        ]);

        $this->actingAs($user)
            ->delete("/finance/recurring/{$rule->id}")
            ->assertRedirect();

        $this->assertSoftDeleted('recurring_rules', ['id' => $rule->id]);
    }

    public function test_cannot_create_rule_with_other_users_account(): void
    {
        $u1 = User::factory()->create();
        $u2 = User::factory()->create();
        $acc = Account::factory()->create(['user_id' => $u1->id, 'type' => 'checking']);

        $this->actingAs($u2)
            ->postJson('/finance/recurring', [
                'account_id'       => $acc->id,
                'type'             => 'expense',
                'amount_encrypted' => 100,
                'description'      => 'tentativa',
                'day_of_month'     => 5,
                'starts_on'        => '2026-01-01',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('account_id');
    }

    public function test_cannot_modify_other_users_rule(): void
    {
        $u1 = User::factory()->create();
        $u2 = User::factory()->create();
        $acc = Account::factory()->create(['user_id' => $u1->id, 'type' => 'checking']);
        $rule = $u1->recurringRules()->create([
            'account_id'       => $acc->id,
            'type'             => 'expense',
            'amount_encrypted' => 100,
            'description'      => 'priv',
            'day_of_month'     => 5,
            'starts_on'        => '2026-01-01',
        ]);

        $this->actingAs($u2)
            ->patch("/finance/recurring/{$rule->id}", ['description' => 'hack'])
            ->assertForbidden();
    }
}
