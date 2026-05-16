<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionListingTest extends TestCase
{
    use RefreshDatabase;

    public function test_listing_paginates_25_per_page(): void
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking']);

        for ($i = 0; $i < 30; $i++) {
            $account->transactions()->create([
                'type'             => 'expense',
                'amount_encrypted' => 10 + $i,
                'description'      => 'Tx ' . $i,
                'occurred_at'      => '2026-05-' . str_pad((string) (($i % 28) + 1), 2, '0', STR_PAD_LEFT),
            ]);
        }

        $response = $this->actingAs($user)->get('/finance/transactions');

        $response->assertInertia(fn ($p) =>
            $p->component('Finance/Transactions')
              ->has('transactions.data', 25)
              ->where('transactions.last_page', 2)
              ->where('transactions.current_page', 1)
        );
    }

    public function test_filter_by_type_returns_only_matching_transactions(): void
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id]);

        $account->transactions()->create(['type' => 'income',  'amount_encrypted' => 1000, 'description' => 'Salário', 'occurred_at' => '2026-05-01']);
        $account->transactions()->create(['type' => 'expense', 'amount_encrypted' => 50,   'description' => 'Mercado', 'occurred_at' => '2026-05-02']);
        $account->transactions()->create(['type' => 'expense', 'amount_encrypted' => 30,   'description' => 'Uber',    'occurred_at' => '2026-05-03']);

        $response = $this->actingAs($user)->get('/finance/transactions?types=expense');

        $response->assertInertia(fn ($p) =>
            $p->has('transactions.data', 2)
              ->where('transactions.data.0.type', 'expense')
        );
    }

    public function test_filter_by_account_returns_only_owned_account(): void
    {
        $user = User::factory()->create();
        $a1   = Account::factory()->create(['user_id' => $user->id, 'name' => 'Conta A']);
        $a2   = Account::factory()->create(['user_id' => $user->id, 'name' => 'Conta B']);

        $a1->transactions()->create(['type' => 'expense', 'amount_encrypted' => 10, 'description' => 'A', 'occurred_at' => '2026-05-01']);
        $a2->transactions()->create(['type' => 'expense', 'amount_encrypted' => 20, 'description' => 'B', 'occurred_at' => '2026-05-02']);

        $response = $this->actingAs($user)->get('/finance/transactions?account_ids=' . $a1->id);

        $response->assertInertia(fn ($p) =>
            $p->has('transactions.data', 1)
              ->where('transactions.data.0.description', 'A')
        );
    }

    public function test_filter_by_date_range_respects_year(): void
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id]);

        $account->transactions()->create(['type' => 'expense', 'amount_encrypted' => 1, 'description' => 'Antiga', 'occurred_at' => '2024-12-15']);
        $account->transactions()->create(['type' => 'expense', 'amount_encrypted' => 2, 'description' => '2026',  'occurred_at' => '2026-03-01']);
        $account->transactions()->create(['type' => 'expense', 'amount_encrypted' => 3, 'description' => 'Recente','occurred_at' => '2026-05-10']);

        $response = $this->actingAs($user)
            ->get('/finance/transactions?date_from=2026-01-01&date_to=2026-04-30');

        $response->assertInertia(fn ($p) =>
            $p->has('transactions.data', 1)
              ->where('transactions.data.0.description', '2026')
        );
    }

    public function test_search_matches_description_case_insensitive(): void
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id]);

        $account->transactions()->create(['type' => 'expense', 'amount_encrypted' => 1, 'description' => 'NETFLIX assinatura', 'occurred_at' => '2026-05-01']);
        $account->transactions()->create(['type' => 'expense', 'amount_encrypted' => 1, 'description' => 'Padaria',           'occurred_at' => '2026-05-02']);

        $response = $this->actingAs($user)->get('/finance/transactions?search=netflix');

        $response->assertInertia(fn ($p) =>
            $p->has('transactions.data', 1)
              ->where('transactions.data.0.description', 'NETFLIX assinatura')
        );
    }

    public function test_listing_excludes_other_users_transactions(): void
    {
        $u1 = User::factory()->create();
        $u2 = User::factory()->create();
        $a1 = Account::factory()->create(['user_id' => $u1->id]);
        $a2 = Account::factory()->create(['user_id' => $u2->id]);

        $a1->transactions()->create(['type' => 'expense', 'amount_encrypted' => 1, 'description' => 'Mine',  'occurred_at' => '2026-05-01']);
        $a2->transactions()->create(['type' => 'expense', 'amount_encrypted' => 1, 'description' => 'Yours', 'occurred_at' => '2026-05-02']);

        $response = $this->actingAs($u1)->get('/finance/transactions');

        $response->assertInertia(fn ($p) =>
            $p->has('transactions.data', 1)
              ->where('transactions.data.0.description', 'Mine')
        );
    }

    public function test_filters_persist_via_query_string_in_pagination_links(): void
    {
        $user    = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id]);

        for ($i = 0; $i < 30; $i++) {
            $account->transactions()->create(['type' => 'expense', 'amount_encrypted' => 1, 'description' => 'Tx ' . $i, 'occurred_at' => '2026-05-' . str_pad((string) (($i % 28) + 1), 2, '0', STR_PAD_LEFT)]);
        }

        $response = $this->actingAs($user)->get('/finance/transactions?types=expense');

        $response->assertInertia(fn ($p) =>
            $p->where('transactions.next_page_url', fn ($url) => str_contains($url ?? '', 'types=expense'))
        );
    }
}
