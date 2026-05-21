<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\InstallmentPlan;
use App\Domains\Finance\Services\InstallmentPlanCreator;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InstallmentPlanTest extends TestCase
{
    use RefreshDatabase;

    public function test_creator_creates_plan_and_n_transactions(): void
    {
        $user = User::factory()->create();
        $card = Account::factory()->create([
            'user_id' => $user->id, 'type' => 'credit', 'balance_encrypted' => 0,
            'credit_limit_encrypted' => 5000,
        ]);

        $plan = app(InstallmentPlanCreator::class)->create($user, [
            'account_id'   => $card->id,
            'description'  => 'MacBook',
            'total_amount' => 1200,
            'installments' => 12,
            'first_due_on' => '2026-06-05',
            'category'     => 'Tecnologia',
        ]);

        $this->assertSame(12, $plan->transactions()->count());
        // Cada parcela: 1200/12 = 100
        $first = $plan->transactions()->where('installment_number', 1)->firstOrFail();
        $this->assertSame(100.0, (float) $first->amount_encrypted);
        $this->assertSame('MacBook (1/12)', $first->description);
        $this->assertSame('2026-06-05', Carbon::parse($first->occurred_at)->toDateString());

        $last = $plan->transactions()->where('installment_number', 12)->firstOrFail();
        $this->assertSame('2027-05-05', Carbon::parse($last->occurred_at)->toDateString());
    }

    public function test_creator_distributes_rounding_into_last_installment(): void
    {
        $user = User::factory()->create();
        $card = Account::factory()->create([
            'user_id' => $user->id, 'type' => 'credit', 'balance_encrypted' => 0,
            'credit_limit_encrypted' => 1000,
        ]);

        // 100 / 3 = 33.33 cada — última precisa fechar 100 exato
        $plan = app(InstallmentPlanCreator::class)->create($user, [
            'account_id'   => $card->id,
            'description'  => 'Curso',
            'total_amount' => 100,
            'installments' => 3,
            'first_due_on' => '2026-06-05',
        ]);

        $amounts = $plan->transactions()->orderBy('installment_number')->get()
            ->map(fn ($t) => (float) $t->amount_encrypted)->all();

        $this->assertSame([33.33, 33.33, 33.34], $amounts);
        $this->assertSame(100.0, array_sum($amounts));
    }

    public function test_creator_rejects_when_total_exceeds_remaining_limit(): void
    {
        $user = User::factory()->create();
        $card = Account::factory()->create([
            'user_id' => $user->id, 'type' => 'credit', 'balance_encrypted' => 4000,
            'credit_limit_encrypted' => 5000,
        ]);

        $this->expectException(\Illuminate\Validation\ValidationException::class);

        app(InstallmentPlanCreator::class)->create($user, [
            'account_id'   => $card->id,
            'description'  => 'Caro',
            'total_amount' => 2000, // disponível é 1000
            'installments' => 4,
            'first_due_on' => '2026-06-05',
        ]);
    }

    public function test_creator_rejects_non_credit_account(): void
    {
        $user = User::factory()->create();
        $acc  = Account::factory()->create(['user_id' => $user->id, 'type' => 'checking']);

        $this->expectException(\Illuminate\Validation\ValidationException::class);

        app(InstallmentPlanCreator::class)->create($user, [
            'account_id'   => $acc->id,
            'description'  => 'Não permitido',
            'total_amount' => 100,
            'installments' => 2,
            'first_due_on' => '2026-06-05',
        ]);
    }

    public function test_endpoint_creates_plan_via_post(): void
    {
        $user = User::factory()->create();
        $card = Account::factory()->create([
            'user_id' => $user->id, 'type' => 'credit', 'balance_encrypted' => 0,
            'credit_limit_encrypted' => 10000,
        ]);

        $this->actingAs($user)
            ->post('/finance/installment-plans', [
                'account_id'   => $card->id,
                'description'  => 'iPhone',
                'total_amount' => 6000,
                'installments' => 6,
                'first_due_on' => '2026-06-10',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('installment_plans', ['description' => 'iPhone']);
        $this->assertSame(6, $card->transactions()->count());
    }

    public function test_destroy_plan_removes_future_installments_only(): void
    {
        Carbon::setTestNow('2026-08-20');

        $user = User::factory()->create();
        $card = Account::factory()->create([
            'user_id' => $user->id, 'type' => 'credit', 'balance_encrypted' => 0,
            'credit_limit_encrypted' => 5000,
        ]);

        $plan = app(InstallmentPlanCreator::class)->create($user, [
            'account_id'   => $card->id,
            'description'  => 'Geladeira',
            'total_amount' => 600,
            'installments' => 6,
            'first_due_on' => '2026-06-10', // jun, jul, ago, set, out, nov
        ]);

        // Hoje = 20/ago. Parcelas 1 (jun), 2 (jul), 3 (ago) já estão "vencidas" → mantidas.
        // 4-6 (set/out/nov) ainda futuras → removidas.
        $this->actingAs($user)
            ->delete("/finance/installment-plans/{$plan->id}")
            ->assertRedirect();

        $remaining = $plan->transactions()->withoutTrashed()->orderBy('installment_number')->get();
        $this->assertSame([1, 2, 3], $remaining->pluck('installment_number')->all());

        Carbon::setTestNow();
    }
}
