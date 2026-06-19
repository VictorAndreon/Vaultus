<?php

namespace Database\Seeders;

use App\Domains\Auth\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'teste@vaultus.local'],
            [
                'name'     => 'Teste',
                'password' => bcrypt('senha123'),
                'timezone' => 'America/Sao_Paulo',
            ]
        );

        // Todos idempotentes (cada um zera o próprio domínio antes de criar).
        // HabitsSeeder antes do JournalSeeder: o Journal vincula entradas às
        // HealthMetrics do dia, que nascem (em parte) no seeder de hábitos.
        $this->call([
            HabitsSeeder::class,
            JournalSeeder::class,
            ContactsSeeder::class,
            ReviewsSeeder::class,
            NotesSeeder::class,
            LibrarySeeder::class,
            ProjectsSeeder::class,
            FinanceSeeder::class,
        ]);
    }
}
