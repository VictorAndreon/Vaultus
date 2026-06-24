<?php

namespace Database\Seeders;

use App\Domains\Auth\Models\User;
use Illuminate\Database\Seeder;

/**
 * Seeder de PRODUCAO: cria apenas o usuario de login.
 *
 * As credenciais vem de variaveis de ambiente (injetadas pelo instalador do
 * deploy/ via .env), NUNCA embutidas no codigo:
 *   - ADMIN_EMAIL             (opcional; padrao teste@vaultus.local)
 *   - ADMIN_INITIAL_PASSWORD  (obrigatoria; o instalador gera uma senha forte)
 *
 * Idempotente: se o usuario ja existe, NAO altera a senha (preserva a que o
 * dono definiu). Nao carrega dados de demonstracao nem apaga nada.
 */
class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email    = env('ADMIN_EMAIL', 'teste@vaultus.local');
        $password = env('ADMIN_INITIAL_PASSWORD');

        if (empty($password)) {
            // Aborta em vez de criar um usuario com senha fraca/previsivel.
            throw new \RuntimeException(
                'ADMIN_INITIAL_PASSWORD nao definida. Rode pelo instalador do deploy/.'
            );
        }

        User::firstOrCreate(
            ['email' => $email],
            [
                'name'     => 'Vaultus',
                'password' => bcrypt($password),
                'timezone' => 'America/Sao_Paulo',
            ]
        );
    }
}
