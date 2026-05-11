<?php

namespace Tests\Feature\Journal;

use App\Domains\Auth\Models\User;
use App\Domains\Journal\Models\JournalEntry;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JournalEntryTest extends TestCase
{
    use RefreshDatabase;

    public function test_journal_page_requires_auth(): void
    {
        $this->get('/journal')->assertRedirect('/login');
    }

    public function test_journal_page_renders_with_correct_props(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/journal')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Journal/Index')
                ->has('entries')
                ->has('prompts')
                ->has('today')
            );
    }

    public function test_can_create_entry_for_a_date(): void
    {
        Carbon::setTestNow('2026-05-10');
        $user = User::factory()->create(['timezone' => 'UTC']);

        $this->actingAs($user)
            ->post('/journal', [
                'date'    => '2026-05-10',
                'content' => '<p>Hoje foi um bom dia.</p>',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('journal_entries', [
            'user_id' => $user->id,
            'date'    => '2026-05-10',
        ]);

        $entry = JournalEntry::where('user_id', $user->id)->first();
        $this->assertEquals('<p>Hoje foi um bom dia.</p>', $entry->content);
    }

    public function test_can_update_existing_entry(): void
    {
        $user  = User::factory()->create();
        $entry = JournalEntry::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->patch("/journal/{$entry->id}", ['content' => '<p>Atualizado.</p>'])
            ->assertRedirect();

        $entry->refresh();
        $this->assertEquals('<p>Atualizado.</p>', $entry->content);
    }

    public function test_cannot_update_other_users_entry(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $entry = JournalEntry::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($other)
            ->patch("/journal/{$entry->id}", ['content' => '<p>Hackeado.</p>'])
            ->assertForbidden();
    }

    public function test_two_entries_same_date_returns_error(): void
    {
        $user = User::factory()->create();
        JournalEntry::factory()->create(['user_id' => $user->id, 'date' => '2026-05-10']);

        $this->actingAs($user)
            ->post('/journal', ['date' => '2026-05-10', 'content' => '<p>Duplicado.</p>'])
            ->assertRedirect()
            ->assertSessionHasErrors('date');
    }
}
