<?php

namespace Tests\Feature\Auth;

use App\Domains\Auth\Models\User;
use App\Domains\Auth\Services\TwoFactorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class TwoFactorSetupTest extends TestCase
{
    use RefreshDatabase;

    private TwoFactorService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(TwoFactorService::class);
    }

    public function test_generates_secret_and_qr_svg(): void
    {
        $user = User::factory()->create(['email' => 'test@example.com']);

        $result = $this->service->generateSetup($user);

        $this->assertArrayHasKey('secret', $result);
        $this->assertArrayHasKey('qr_svg', $result);
        $this->assertNotEmpty($result['secret']);
        $this->assertStringContainsString('<svg', $result['qr_svg']);
    }

    public function test_verifies_valid_otp(): void
    {
        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();
        $user = User::factory()->create(['two_factor_secret' => $secret]);
        $otp = $google2fa->getCurrentOtp($secret);

        $this->assertTrue($this->service->verify($user, $otp));
    }

    public function test_rejects_invalid_otp(): void
    {
        $user = User::factory()->create(['two_factor_secret' => 'JBSWY3DPEHPK3PXP']);

        $this->assertFalse($this->service->verify($user, '000000'));
    }

    public function test_confirms_two_factor_setup(): void
    {
        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();
        $user = User::factory()->create(['two_factor_secret' => $secret]);
        $otp = $google2fa->getCurrentOtp($secret);

        $this->service->confirm($user, $otp);

        $this->assertNotNull($user->fresh()->two_factor_confirmed_at);
    }
}
