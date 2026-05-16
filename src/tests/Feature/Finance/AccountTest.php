<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountTest extends TestCase
{
    use RefreshDatabase;

    public function test_finance_page_requires_auth(): void
    {
        $this->get('/finance')->assertRedirect('/login');
    }

    public function test_finance_page_renders_with_correct_props(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/finance')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Finance/Index')
                ->has('accounts_list')
                ->has('goals')
                ->has('net_worth')
            );
    }

    public function test_can_create_account(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/finance/accounts', [
                'name'              => 'Nubank',
                'type'              => 'checking',
                'balance_encrypted' => 1000.00,
                'currency'          => 'BRL',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('accounts', [
            'user_id' => $user->id,
            'name'    => 'Nubank',
        ]);
    }

    public function test_can_update_account(): void
    {
        $user = User::factory()->create();
        $account = Account::create([
            'user_id'           => $user->id,
            'name'              => 'Nubank',
            'type'              => 'checking',
            'balance_encrypted' => 1000.00,
            'currency'          => 'BRL',
        ]);

        $this->actingAs($user)
            ->patch("/finance/accounts/{$account->id}", [
                'name' => 'Nubank Updated',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('accounts', [
            'id'   => $account->id,
            'name' => 'Nubank Updated',
        ]);
    }

    public function test_can_delete_account(): void
    {
        $user = User::factory()->create();
        $account = Account::create([
            'user_id'           => $user->id,
            'name'              => 'Conta Corrente',
            'type'              => 'checking',
            'balance_encrypted' => 500.00,
            'currency'          => 'BRL',
        ]);

        $this->actingAs($user)
            ->delete("/finance/accounts/{$account->id}")
            ->assertRedirect();

        $this->assertSoftDeleted('accounts', ['id' => $account->id]);
    }

    public function test_cannot_access_other_users_account(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $account = Account::create([
            'user_id'           => $user1->id,
            'name'              => 'Conta do User1',
            'type'              => 'checking',
            'balance_encrypted' => 100.00,
            'currency'          => 'BRL',
        ]);

        $this->actingAs($user2)
            ->get("/finance/accounts/{$account->id}")
            ->assertForbidden();
    }
}
