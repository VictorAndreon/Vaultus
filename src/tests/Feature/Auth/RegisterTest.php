<?php

namespace Tests\Feature\Auth;

use App\Domains\Auth\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegisterTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_page_is_accessible_when_no_users_exist(): void
    {
        $this->get('/register')->assertStatus(200);
    }

    public function test_first_user_can_register_and_is_logged_in(): void
    {
        $response = $this->post('/register', [
            'name' => 'Meu Irmão',
            'email' => 'irmao@example.com',
            'password' => 'segredo-forte',
            'password_confirmation' => 'segredo-forte',
        ]);

        $response->assertRedirect('/dashboard');
        $this->assertAuthenticated();

        $user = User::where('email', 'irmao@example.com')->first();
        $this->assertNotNull($user);
        $this->assertSame('Meu Irmão', $user->name);
        $this->assertNotEmpty($user->timezone);
    }

    public function test_register_is_locked_once_a_user_exists(): void
    {
        User::factory()->create();

        // Página redireciona para o login.
        $this->get('/register')->assertRedirect('/login');

        // POST não cria um segundo usuário.
        $this->post('/register', [
            'name' => 'Intruso',
            'email' => 'intruso@example.com',
            'password' => 'segredo-forte',
            'password_confirmation' => 'segredo-forte',
        ])->assertRedirect('/login');

        $this->assertDatabaseMissing('users', ['email' => 'intruso@example.com']);
        $this->assertGuest();
    }

    public function test_register_validates_input(): void
    {
        $this->post('/register', [
            'name' => '',
            'email' => 'nao-e-email',
            'password' => 'curta',
            'password_confirmation' => 'diferente',
        ])->assertSessionHasErrors(['name', 'email', 'password']);

        $this->assertGuest();
        $this->assertDatabaseCount('users', 0);
    }
}
