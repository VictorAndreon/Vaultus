<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountTypeTest extends TestCase
{
    use RefreshDatabase;

    public function test_credit_account_is_accepted()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/finance/accounts', [
            'name'              => 'Cartão Nubank',
            'type'              => 'credit',
            'balance_encrypted' => 0,
            'currency'          => 'BRL',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('accounts', ['name' => 'Cartão Nubank', 'type' => 'credit']);
    }

    public function test_loan_account_is_accepted()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/finance/accounts', [
            'name'              => 'Financiamento Carro',
            'type'              => 'loan',
            'balance_encrypted' => 30000,
            'currency'          => 'BRL',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('accounts', ['name' => 'Financiamento Carro', 'type' => 'loan']);
    }

    public function test_net_worth_subtracts_liabilities()
    {
        $user = User::factory()->create();
        $asset     = Account::factory()->create(['user_id' => $user->id, 'type' => 'savings',  'balance_encrypted' => 50000]);
        $liability = Account::factory()->create(['user_id' => $user->id, 'type' => 'credit',   'balance_encrypted' => 8000]);

        $response = $this->actingAs($user)->get('/finance');

        $response->assertInertia(fn ($page) =>
            $page->where('net_worth', 42000)
        );
    }

    public function test_credit_account_is_liability()
    {
        $account = new Account(['type' => 'credit']);
        $this->assertTrue($account->is_liability);
    }

    public function test_loan_account_is_liability()
    {
        $account = new Account(['type' => 'loan']);
        $this->assertTrue($account->is_liability);
    }

    public function test_checking_account_is_not_liability()
    {
        $account = new Account(['type' => 'checking']);
        $this->assertFalse($account->is_liability);
    }
}
