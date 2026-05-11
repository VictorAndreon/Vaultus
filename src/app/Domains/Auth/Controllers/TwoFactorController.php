<?php

namespace App\Domains\Auth\Controllers;

use App\Domains\Auth\Models\User;
use App\Domains\Auth\Services\AuditLogger;
use App\Domains\Auth\Services\TwoFactorService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class TwoFactorController extends Controller
{
    public function __construct(
        private TwoFactorService $twoFactor,
        private AuditLogger $audit
    ) {}

    public function show(Request $request)
    {
        if (!$request->session()->has('auth.2fa_user_id')) {
            return redirect()->route('login');
        }

        return Inertia::render('Auth/TwoFactor');
    }

    public function verify(Request $request)
    {
        $request->validate(['code' => ['required', 'string', 'size:6']]);

        $userId = $request->session()->get('auth.2fa_user_id');
        if (!$userId) {
            return redirect()->route('login');
        }

        $user = User::findOrFail($userId);

        if (!$this->twoFactor->verify($user, $request->code)) {
            $this->audit->log('2fa_failed', $user->id);
            throw ValidationException::withMessages(['code' => 'Código inválido.']);
        }

        $request->session()->forget('auth.2fa_user_id');
        $request->session()->regenerate();
        Auth::login($user);
        $this->audit->log('login', $user->id, ['method' => '2fa']);

        return redirect()->intended('/dashboard');
    }
}
