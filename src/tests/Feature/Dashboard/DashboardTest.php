<?php

namespace Tests\Feature\Dashboard;

use App\Domains\Auth\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_requires_auth(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_authenticated_user_sees_dashboard(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard/Index')
                ->has('stats')
            );
    }

    public function test_library_item_progress_percent_calculates_correctly(): void
    {
        $user = User::factory()->create();

        \App\Domains\Library\Models\LibraryItem::create([
            'user_id'      => $user->id,
            'type'         => 'book',
            'title'        => 'Test Book',
            'status'       => 'reading',
            'total_pages'  => 200,
            'current_page' => 50,
        ]);

        $item = $user->libraryItems()->first();

        $this->assertEquals(25, $item->progress_percent);
    }
}
