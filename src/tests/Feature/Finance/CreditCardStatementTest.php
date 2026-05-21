<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Services\CreditCardStatement;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CreditCardStatementTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_statement_groups_transactions_inside_cycle_window(): void
    {
        // Cartão com fechamento dia 5, vence dia 15. A fatura de "maio" cobre 06/abr a 05/mai.
        $user = User::factory()->create();
        $card = Account::factory()->create([
            'user_id' => $user->id, 'type' => 'credit', 'balance_encrypted' => 0,
            'closing_day' => 5, 'due_day' => 15,
        ]);

        $card->transactions()->create(['type' => 'expense', 'amount_encrypted' => 100, 'description' => 'Antes', 'occurred_at' => '2026-04-05']);
        $card->transactions()->create(['type' => 'expense', 'amount_encrypted' => 200, 'description' => 'Inicio', 'occurred_at' => '2026-04-06']);
        $card->transactions()->create(['type' => 'expense', 'amount_encrypted' => 300, 'description' => 'Meio', 'occurred_at' => '2026-04-20']);
        $card->transactions()->create(['type' => 'expense', 'amount_encrypted' => 50,  'description' => 'Fechamento', 'occurred_at' => '2026-05-05']);
        $card->transactions()->create(['type' => 'expense', 'amount_encrypted' => 999, 'description' => 'Depois', 'occurred_at' => '2026-05-06']);

        $statement = app(CreditCardStatement::class)->forMonth($card, Carbon::parse('2026-05-15'));

        $this->assertSame('2026-04-06', $statement['period_start']);
        $this->assertSame('2026-05-05', $statement['period_end']);
        $this->assertSame('2026-05-05', $statement['closes_at']);
        $this->assertSame('2026-05-15', $statement['due_at']);
        $this->assertSame(550.0, $statement['total']);
        $this->assertCount(3, $statement['transactions']);
    }

    public function test_statement_marks_as_paid_when_transfer_into_card_covers_total(): void
    {
        Carbon::setTestNow('2026-05-20');

        $user     = User::factory()->create();
        $checking = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'balance_encrypted' => 5000]);
        $card     = Account::factory()->create([
            'user_id' => $user->id, 'type' => 'credit', 'balance_encrypted' => 0,
            'closing_day' => 5, 'due_day' => 15,
        ]);

        // Fatura de maio: R$ 400 em despesas
        $card->transactions()->create(['type' => 'expense', 'amount_encrypted' => 400, 'description' => 'Compra', 'occurred_at' => '2026-04-20']);

        // Usuário paga a fatura: transferência checking → cartão de R$ 400, ocorrida em 14/05
        $out = $checking->transactions()->create([
            'type' => 'transfer', 'amount_encrypted' => 400, 'description' => 'Pagamento fatura',
            'occurred_at' => '2026-05-14', 'transfer_to_account_id' => $card->id,
        ]);
        $in  = $card->transactions()->create([
            'type' => 'transfer', 'amount_encrypted' => 400, 'description' => 'Pagamento fatura',
            'occurred_at' => '2026-05-14', 'transfer_pair_id' => $out->id,
        ]);
        $out->update(['transfer_pair_id' => $in->id]);

        $statement = app(CreditCardStatement::class)->forMonth($card, Carbon::parse('2026-05-15'));

        $this->assertSame(400.0, $statement['total']);
        $this->assertSame(400.0, $statement['paid']);
        $this->assertSame('paga', $statement['status']);
    }

    public function test_statement_status_is_open_before_closing(): void
    {
        Carbon::setTestNow('2026-05-03'); // antes do fechamento 05/05

        $user = User::factory()->create();
        $card = Account::factory()->create([
            'user_id' => $user->id, 'type' => 'credit', 'balance_encrypted' => 0,
            'closing_day' => 5, 'due_day' => 15,
        ]);
        $card->transactions()->create(['type' => 'expense', 'amount_encrypted' => 100, 'description' => 'X', 'occurred_at' => '2026-04-10']);

        $statement = app(CreditCardStatement::class)->forMonth($card, Carbon::parse('2026-05-15'));

        $this->assertSame('aberta', $statement['status']);
    }

    public function test_statement_status_is_atrasada_when_past_due_and_unpaid(): void
    {
        Carbon::setTestNow('2026-05-20'); // venceu 15/05

        $user = User::factory()->create();
        $card = Account::factory()->create([
            'user_id' => $user->id, 'type' => 'credit', 'balance_encrypted' => 0,
            'closing_day' => 5, 'due_day' => 15,
        ]);
        $card->transactions()->create(['type' => 'expense', 'amount_encrypted' => 100, 'description' => 'X', 'occurred_at' => '2026-04-10']);

        $statement = app(CreditCardStatement::class)->forMonth($card, Carbon::parse('2026-05-15'));

        $this->assertSame('atrasada', $statement['status']);
    }

    public function test_statement_status_is_fechada_after_closing_before_due(): void
    {
        Carbon::setTestNow('2026-05-10'); // entre fechamento (05) e vencimento (15)

        $user = User::factory()->create();
        $card = Account::factory()->create([
            'user_id' => $user->id, 'type' => 'credit', 'balance_encrypted' => 0,
            'closing_day' => 5, 'due_day' => 15,
        ]);
        $card->transactions()->create(['type' => 'expense', 'amount_encrypted' => 100, 'description' => 'X', 'occurred_at' => '2026-04-10']);

        $statement = app(CreditCardStatement::class)->forMonth($card, Carbon::parse('2026-05-15'));

        $this->assertSame('fechada', $statement['status']);
    }

    public function test_statement_route_requires_credit_account(): void
    {
        $user = User::factory()->create();
        $acc  = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking']);

        $this->actingAs($user)
            ->getJson("/finance/accounts/{$acc->id}/statement")
            ->assertStatus(422);
    }

    public function test_statement_route_requires_cycle_days(): void
    {
        $user = User::factory()->create();
        $card = Account::factory()->create([
            'user_id' => $user->id, 'type' => 'credit', 'balance_encrypted' => 0,
            'closing_day' => null, 'due_day' => null,
        ]);

        $this->actingAs($user)
            ->getJson("/finance/accounts/{$card->id}/statement")
            ->assertStatus(422);
    }

    public function test_statement_route_renders_page_with_props(): void
    {
        Carbon::setTestNow('2026-05-10');
        $user = User::factory()->create();
        $card = Account::factory()->create([
            'user_id' => $user->id, 'type' => 'credit', 'balance_encrypted' => 0,
            'closing_day' => 5, 'due_day' => 15,
        ]);

        $this->actingAs($user)
            ->get("/finance/accounts/{$card->id}/statement")
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Finance/Statement')
                ->has('account')
                ->has('statement')
                ->where('account.id', $card->id)
            );
    }

    public function test_statement_route_exposes_payment_accounts(): void
    {
        Carbon::setTestNow('2026-05-10');
        $user = User::factory()->create();
        $card = Account::factory()->create([
            'user_id' => $user->id, 'type' => 'credit', 'balance_encrypted' => 0,
            'closing_day' => 5, 'due_day' => 15,
        ]);
        Account::factory()->create(['user_id' => $user->id, 'type' => 'checking', 'name' => 'Nubank',  'balance_encrypted' => 5000]);
        Account::factory()->create(['user_id' => $user->id, 'type' => 'investment', 'name' => 'XP', 'balance_encrypted' => 0]);

        $this->actingAs($user)
            ->get("/finance/accounts/{$card->id}/statement")
            ->assertInertia(fn ($page) => $page
                ->has('payment_accounts', 1) // só checking, savings ou cash
                ->where('payment_accounts.0.name', 'Nubank')
            );
    }

    public function test_statement_route_forbids_other_users_card(): void
    {
        $u1 = User::factory()->create();
        $u2 = User::factory()->create();
        $card = Account::factory()->create([
            'user_id' => $u1->id, 'type' => 'credit', 'balance_encrypted' => 0,
            'closing_day' => 5, 'due_day' => 15,
        ]);

        $this->actingAs($u2)
            ->get("/finance/accounts/{$card->id}/statement")
            ->assertForbidden();
    }
}
