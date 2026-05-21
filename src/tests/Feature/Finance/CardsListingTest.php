<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CardsListingTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_cards_page_renders_with_credit_accounts_only(): void
    {
        $user = User::factory()->create();
        $card = Account::factory()->create([
            'user_id' => $user->id, 'type' => 'credit', 'balance_encrypted' => 200,
            'credit_limit_encrypted' => 5000, 'closing_day' => 5, 'due_day' => 15,
        ]);
        Account::factory()->create(['user_id' => $user->id, 'type' => 'checking']);

        $this->actingAs($user)
            ->get('/finance/cards')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Finance/Cards')
                ->has('cards', 1)
                ->where('cards.0.id', $card->id)
                ->where('cards.0.credit_limit', 5000)
                ->where('cards.0.used', 200)
            );
    }

    public function test_cards_page_includes_current_statement_summary(): void
    {
        Carbon::setTestNow('2026-05-10');

        $user = User::factory()->create();
        $card = Account::factory()->create([
            'user_id' => $user->id, 'type' => 'credit', 'balance_encrypted' => 0,
            'credit_limit_encrypted' => 5000, 'closing_day' => 5, 'due_day' => 15,
        ]);
        $card->transactions()->create([
            'type' => 'expense', 'amount_encrypted' => 300,
            'description' => 'Compra fatura aberta', 'occurred_at' => '2026-04-20',
        ]);

        $this->actingAs($user)
            ->get('/finance/cards')
            ->assertInertia(fn ($page) => $page
                ->has('cards', 1)
                ->where('cards.0.current_statement.total', 300)
                ->where('cards.0.current_statement.status', 'fechada')
            );
    }

    public function test_cards_page_handles_card_without_cycle_days(): void
    {
        $user = User::factory()->create();
        Account::factory()->create([
            'user_id' => $user->id, 'type' => 'credit', 'balance_encrypted' => 0,
            'credit_limit_encrypted' => 1000, 'closing_day' => null, 'due_day' => null,
        ]);

        $this->actingAs($user)
            ->get('/finance/cards')
            ->assertInertia(fn ($page) => $page
                ->has('cards', 1)
                ->where('cards.0.current_statement', null)
            );
    }
}
