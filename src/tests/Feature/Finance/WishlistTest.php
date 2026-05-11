<?php

namespace Tests\Feature\Finance;

use App\Domains\Auth\Models\User;
use App\Domains\Finance\Models\FinancialGoal;
use App\Domains\Finance\Models\WishlistItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WishlistTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_wishlist_item(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/finance/wishlist', [
                'name'                      => 'iPhone',
                'estimated_price_encrypted' => 5000.00,
                'priority'                  => 'high',
                'url'                       => null,
                'notes'                     => null,
                'financial_goal_id'         => null,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('wishlist_items', [
            'user_id' => $user->id,
            'name'    => 'iPhone',
        ]);
    }

    public function test_can_update_wishlist_item(): void
    {
        $user = User::factory()->create();
        $item = WishlistItem::create([
            'user_id'                   => $user->id,
            'name'                      => 'iPhone',
            'estimated_price_encrypted' => 5000.00,
            'priority'                  => 'high',
        ]);

        $this->actingAs($user)
            ->patch("/finance/wishlist/{$item->id}", [
                'name' => 'MacBook',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('wishlist_items', [
            'id'   => $item->id,
            'name' => 'MacBook',
        ]);
    }

    public function test_can_link_item_to_goal(): void
    {
        $user = User::factory()->create();
        $goal = FinancialGoal::create([
            'user_id'                 => $user->id,
            'name'                    => 'Poupança Tech',
            'target_amount_encrypted' => 10000.00,
            'category'                => 'Tecnologia',
        ]);
        $item = WishlistItem::create([
            'user_id'                   => $user->id,
            'name'                      => 'MacBook',
            'estimated_price_encrypted' => 8000.00,
            'priority'                  => 'medium',
        ]);

        $this->actingAs($user)
            ->patch("/finance/wishlist/{$item->id}", [
                'financial_goal_id' => $goal->id,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('wishlist_items', [
            'id'                => $item->id,
            'financial_goal_id' => $goal->id,
        ]);
    }

    public function test_can_delete_wishlist_item(): void
    {
        $user = User::factory()->create();
        $item = WishlistItem::create([
            'user_id'                   => $user->id,
            'name'                      => 'Câmera',
            'estimated_price_encrypted' => 2000.00,
            'priority'                  => 'low',
        ]);

        $this->actingAs($user)
            ->delete("/finance/wishlist/{$item->id}")
            ->assertRedirect();

        $this->assertSoftDeleted('wishlist_items', ['id' => $item->id]);
    }

    public function test_cannot_link_to_other_users_goal(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $goalUser1 = FinancialGoal::create([
            'user_id'                 => $user1->id,
            'name'                    => 'Meta User1',
            'target_amount_encrypted' => 5000.00,
            'category'                => 'Lazer',
        ]);

        $this->actingAs($user2)
            ->post('/finance/wishlist', [
                'name'                      => 'Item User2',
                'estimated_price_encrypted' => 1000.00,
                'priority'                  => 'low',
                'financial_goal_id'         => $goalUser1->id,
            ])
            ->assertSessionHasErrors('financial_goal_id');
    }
}
