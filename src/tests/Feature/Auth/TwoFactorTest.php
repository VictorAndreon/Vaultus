<?php

namespace Tests\Feature\Auth;

use App\Domains\Auth\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class TwoFactorTest extends TestCase
{
    use RefreshDatabase;

    public function test_two_factor_page_requires_pending_session(): void
    {
        $this->get('/two-factor')->assertRedirect('/login');
    }

    public function test_valid_otp_logs_user_in(): void
    {
        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();
        $user = User::factory()->create([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
        ]);
        $otp = $google2fa->getCurrentOtp($secret);

        $this->withSession(['auth.2fa_user_id' => $user->id])
            ->post('/two-factor', ['code' => $otp])
            ->assertRedirect('/dashboard');

        $this->assertAuthenticatedAs($user);
    }

    public function test_invalid_otp_returns_error(): void
    {
        $user = User::factory()->create([
            'two_factor_secret' => 'JBSWY3DPEHPK3PXP',
            'two_factor_confirmed_at' => now(),
        ]);

        $this->withSession(['auth.2fa_user_id' => $user->id])
            ->post('/two-factor', ['code' => '000000'])
            ->assertSessionHasErrors('code');

        $this->assertGuest();
    }
}
