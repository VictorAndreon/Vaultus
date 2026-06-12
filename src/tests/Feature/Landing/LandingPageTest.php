<?php

namespace Tests\Feature\Landing;

use App\Domains\Auth\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LandingPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_sees_landing_page(): void
    {
        $this->get('/')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page->component('Landing/Index'));
    }

    public function test_authenticated_user_is_redirected_to_dashboard(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/')
            ->assertRedirect('/dashboard');
    }
}
