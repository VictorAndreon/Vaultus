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

        $this->call([
            NotesSeeder::class,
            ContactsSeeder::class,
        ]);
    }
}
