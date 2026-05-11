<?php

namespace Tests\Feature\Auth;

use App\Domains\Auth\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_page_is_accessible(): void
    {
        $this->get('/login')->assertStatus(200);
    }

    public function test_user_without_2fa_is_logged_in_directly(): void
    {
        $user = User::factory()->create(['email' => 'user@example.com', 'password' => 'password']);

        $this->post('/login', ['email' => 'user@example.com', 'password' => 'password'])
            ->assertRedirect('/dashboard');

        $this->assertAuthenticatedAs($user);
    }

    public function test_user_with_2fa_is_redirected_to_two_factor_page(): void
    {
        $user = User::factory()->create([
            'email' => 'user@example.com',
            'password' => 'password',
            'two_factor_confirmed_at' => now(),
            'two_factor_secret' => 'JBSWY3DPEHPK3PXP',
        ]);

        $this->post('/login', ['email' => 'user@example.com', 'password' => 'password'])
            ->assertRedirect('/two-factor');

        $this->assertGuest();
        $this->assertEquals($user->id, session('auth.2fa_user_id'));
    }

    public function test_invalid_credentials_return_error(): void
    {
        User::factory()->create(['email' => 'user@example.com', 'password' => 'password']);

        $this->post('/login', ['email' => 'user@example.com', 'password' => 'wrong'])
            ->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_logout_clears_session(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->post('/logout');
        $this->assertGuest();
    }
}
