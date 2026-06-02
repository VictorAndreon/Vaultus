<?php

namespace Tests\Feature\Contacts;

use App\Domains\Auth\Models\User;
use App\Domains\Contacts\Models\Contact;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContactsTimezoneTest extends TestCase
{
    use RefreshDatabase;

    public function test_birthday_days_away_uses_user_timezone_not_utc(): void
    {
        // UTC: 02/06 01:00 (já é dia 02). São Paulo (UTC-3): 01/06 22:00 (ainda dia 01).
        // Aniversário em 02/06 deve ficar a 1 dia (amanhã, hora local), não a 0 (hoje, em UTC).
        $user = User::factory()->create(['timezone' => 'America/Sao_Paulo']);

        Contact::create([
            'user_id'  => $user->id,
            'name'     => 'Aniversariante',
            'birthday' => '1990-06-02',
        ]);

        $this->travelTo(\Illuminate\Support\Carbon::parse('2026-06-02 01:00:00', 'UTC'), function () use ($user) {
            $this->actingAs($user)
                ->get('/contacts')
                ->assertInertia(fn($page) => $page
                    ->where('contacts.0.upcoming_birthday.days_away', 1));
        });
    }
}
