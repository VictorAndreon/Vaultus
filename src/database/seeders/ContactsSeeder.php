<?php

namespace Database\Seeders;

use App\Domains\Auth\Models\User;
use App\Domains\Contacts\Models\Contact;
use Illuminate\Database\Seeder;

class ContactsSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();
        if (! $user) return;

        // Idempotente: re-rodar não duplica contatos.
        Contact::withTrashed()->where('user_id', $user->id)->forceDelete();

        $contacts = [
            // Família
            ['name' => 'Heloísa Camargo',   'email' => 'helo@gmail.com',     'phone' => '(11) 99812-4501', 'context' => 'Família',  'birthday' => '1962-03-14', 'next_step' => 'Ligar no fim de semana', 'last_contacted_at' => '2026-05-19', 'remind_after_days' => 14],
            ['name' => 'Paulo Andreon',     'email' => 'paulo.andreon@yahoo.com', 'phone' => '(11) 99840-3322', 'context' => 'Família', 'birthday' => '1958-11-02', 'last_contacted_at' => '2026-05-12', 'remind_after_days' => 21],
            ['name' => 'Mariana Camargo',   'email' => null,                 'phone' => '(11) 98301-7720', 'context' => 'Família',  'birthday' => '1990-07-22', 'next_step' => 'Marcar almoço', 'last_contacted_at' => '2026-04-30', 'remind_after_days' => 30],
            // Trabalho
            ['name' => 'Renato Mendes',     'email' => 'renato@empresa.com', 'phone' => '(11) 97520-1144', 'context' => 'Trabalho', 'birthday' => '1985-09-08', 'next_step' => 'Revisar proposta de design', 'last_contacted_at' => '2026-05-25'],
            ['name' => 'Larissa Tavares',   'email' => 'lari@empresa.com',   'phone' => '(11) 97604-8821', 'context' => 'Trabalho', 'birthday' => '1992-12-30', 'last_contacted_at' => '2026-05-23'],
            ['name' => 'Bruno Lacerda',     'email' => 'bruno@cliente.com',  'phone' => '(21) 98722-1190', 'context' => 'Trabalho', 'birthday' => '1979-04-11', 'next_step' => 'Enviar resumo de projeto', 'last_contacted_at' => '2026-05-15', 'remind_after_days' => 7],
            // Saúde
            ['name' => 'Dra. Patrícia Aoki','email' => 'consulta@clinica.com', 'phone' => '(11) 3251-0099', 'context' => 'Saúde',    'birthday' => null,         'next_step' => 'Agendar retorno semestral', 'last_contacted_at' => '2025-12-10'],
            ['name' => 'Dr. Marcos Silva',  'email' => null,                 'phone' => '(11) 3422-7702', 'context' => 'Saúde',    'birthday' => null,         'last_contacted_at' => '2026-02-04'],
            // Casa
            ['name' => 'Síndico Carlos',    'email' => null,                 'phone' => '(11) 3987-4400', 'context' => 'Casa',     'birthday' => null,         'next_step' => 'Pagar condomínio mai', 'last_contacted_at' => '2026-05-02'],
            ['name' => 'Diarista Sandra',   'email' => null,                 'phone' => '(11) 98712-3344', 'context' => 'Casa',     'birthday' => '1968-06-18', 'last_contacted_at' => '2026-05-24'],
            ['name' => 'Eletricista João',  'email' => null,                 'phone' => '(11) 98200-9911', 'context' => 'Casa',     'birthday' => null,         'last_contacted_at' => '2025-11-30'],
            ['name' => 'Padaria Bella',     'email' => null,                 'phone' => '(11) 3022-1188', 'context' => 'Casa',     'birthday' => null,         'last_contacted_at' => null],
        ];

        foreach ($contacts as $c) {
            Contact::factory()->create(array_merge(['user_id' => $user->id], $c));
        }
    }
}
