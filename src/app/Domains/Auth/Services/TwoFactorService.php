<?php

namespace App\Domains\Auth\Services;

use App\Domains\Auth\Models\User;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorService
{
    public function __construct(private Google2FA $google2fa) {}

    public function generateSetup(User $user): array
    {
        $secret = $this->google2fa->generateSecretKey();

        $qrCodeUrl = $this->google2fa->getQRCodeUrl(
            config('app.name'),
            $user->email,
            $secret
        );

        $renderer = new ImageRenderer(
            new RendererStyle(200),
            new SvgImageBackEnd()
        );
        $qrSvg = (new Writer($renderer))->writeString($qrCodeUrl);

        return ['secret' => $secret, 'qr_svg' => $qrSvg];
    }

    public function verify(User $user, string $otp): bool
    {
        if (!$user->two_factor_secret) {
            return false;
        }

        return (bool) $this->google2fa->verifyKey($user->two_factor_secret, $otp);
    }

    public function confirm(User $user, string $otp): void
    {
        if (!$this->verify($user, $otp)) {
            throw new \RuntimeException('OTP inválido');
        }

        $user->update(['two_factor_confirmed_at' => now()]);
    }

    public function disable(User $user): void
    {
        $user->update([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ]);
    }
}
