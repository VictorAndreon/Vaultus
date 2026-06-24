<?php

namespace App\Domains\Auth\Controllers;

use App\Domains\Auth\Models\User;
use App\Domains\Auth\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function __construct(private AuditLogger $audit) {}

    public function showLogin()
    {
        // No primeiro acesso (sem nenhum usuário) a tela de login oferece o
        // link para criar a conta. Depois disso o cadastro fica travado.
        return Inertia::render('Auth/Login', [
            'canRegister' => !User::exists(),
        ]);
    }

    public function showRegister()
    {
        // Cadastro de primeiro acesso: disponível apenas enquanto não houver
        // nenhum usuário. Uma vez criada a conta do dono, redireciona ao login.
        if (User::exists()) {
            return redirect('/login');
        }

        return Inertia::render('Auth/Register');
    }

    public function register(Request $request)
    {
        // Defesa em profundidade: mesmo que alguém envie o POST direto, só o
        // primeiro usuário é aceito.
        if (User::exists()) {
            return redirect('/login');
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'timezone' => 'America/Sao_Paulo',
        ]);

        Auth::login($user);
        $request->session()->regenerate();
        $this->audit->log('register', $user->id);

        return redirect()->intended('/dashboard');
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $key = 'login.' . $request->ip();

        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            throw ValidationException::withMessages([
                'email' => "Muitas tentativas. Aguarde {$seconds} segundos.",
            ]);
        }

        if (!Auth::attempt($credentials, $request->boolean('remember'))) {
            RateLimiter::hit($key, 60);
            $this->audit->log('login_failed', null, ['email' => $credentials['email']]);

            throw ValidationException::withMessages(['email' => 'Credenciais inválidas.']);
        }

        RateLimiter::clear($key);

        $user = Auth::user();

        if ($user->hasTwoFactorEnabled()) {
            Auth::logout();
            $request->session()->put('auth.2fa_user_id', $user->id);
            return redirect()->route('two-factor.show');
        }

        $request->session()->regenerate();
        $this->audit->log('login', $user->id);

        return redirect()->intended('/dashboard');
    }

    public function logout(Request $request)
    {
        $userId = Auth::id();
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        $this->audit->log('logout', $userId);

        return redirect('/login');
    }

    public function apiLogin(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
            'device_name' => ['required', 'string'],
        ]);

        $user = \App\Domains\Auth\Models\User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            $this->audit->log('api_login_failed', null, ['email' => $data['email']]);
            throw ValidationException::withMessages(['email' => 'Credenciais inválidas.']);
        }

        if ($user->hasTwoFactorEnabled()) {
            $request->validate(['totp_code' => ['required', 'string', 'size:6']]);
            $twoFactor = app(\App\Domains\Auth\Services\TwoFactorService::class);

            if (!$twoFactor->verify($user, $request->totp_code)) {
                throw ValidationException::withMessages(['totp_code' => 'Código 2FA inválido.']);
            }
        }

        $user->tokens()->where('name', $data['device_name'])->delete();
        $token = $user->createToken($data['device_name']);
        $this->audit->log('api_login', $user->id, ['device' => $data['device_name']]);

        return response()->json(['token' => $token->plainTextToken]);
    }

    public function apiLogout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Deslogado com sucesso.']);
    }
}
