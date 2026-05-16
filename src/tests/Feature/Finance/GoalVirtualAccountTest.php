<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\FinancialGoal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GoalVirtualAccountTest extends TestCase
{
    use RefreshDatabase;

    public function test_creating_goal_creates_virtual_account()
    {
        $user = User::factory()->create();

        $goal = $user->financialGoals()->create([
            'name'                    => 'Reserva de Emergência',
            'target_amount_encrypted' => 10000,
        ]);

        $virtual = Account::where('goal_id', $goal->id)->first();

        $this->assertNotNull($virtual);
        $this->assertSame('goal', $virtual->type);
        $this->assertTrue((bool) $virtual->is_internal);
        $this->assertSame($user->id, $virtual->user_id);
        $this->assertSame($goal->name, $virtual->name);
    }

    public function test_virtual_accounts_are_hidden_from_user_account_list()
    {
        $user = User::factory()->create();

        Account::factory()->create(['user_id' => $user->id, 'type' => 'checking']);
        $user->financialGoals()->create([
            'name'                    => 'Viagem',
            'target_amount_encrypted' => 5000,
        ]);

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) =>
            $page->has('accounts_list', 1)
        );
    }

    public function test_deleting_goal_also_deletes_virtual_account()
    {
        $user = User::factory()->create();

        $goal = $user->financialGoals()->create([
            'name'                    => 'Carro',
            'target_amount_encrypted' => 30000,
        ]);

        $virtualId = Account::where('goal_id', $goal->id)->value('id');

        $goal->delete();

        $this->assertSoftDeleted('accounts', ['id' => $virtualId]);
    }
}
