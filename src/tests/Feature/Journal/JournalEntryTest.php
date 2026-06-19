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

    /**
     * Regressão: as props devem chegar SEM o envelope `data` do JsonResource.
     * O front lê os campos no topo (e.date, e.tags, prompt.content); o wrapper
     * deixava o calendário sem marcação, a lista com "Invalid Date" e impedia
     * abrir entradas existentes (find por e.date falhava). Espelha o caso do
     * Habits — ver HabitCrudTest::test_index_props_are_not_wrapped_in_data.
     */
    public function test_index_props_are_not_wrapped_in_data(): void
    {
        $user = User::factory()->create(['timezone' => 'America/Sao_Paulo']);

        $entry = JournalEntry::factory()->create([
            'user_id' => $user->id,
            'date'    => '2026-05-10',
            'title'   => 'Dia bom',
            'content' => '<p>conteudo</p>',
            'tags'    => ['Gratidão', 'Insight'],
        ]);
        $user->journalPrompts()->create([
            'content' => 'Pelo que sou grato?', 'is_active' => true, 'position' => 1,
        ]);

        $this->actingAs($user)
            ->get('/journal')
            ->assertInertia(fn ($page) => $page
                ->where('entries.0.id', $entry->id)
                ->where('entries.0.date', '2026-05-10')
                ->where('entries.0.title', 'Dia bom')
                ->where('entries.0.tags', ['Gratidão', 'Insight'])
                ->missing('entries.0.data')
                ->where('prompts.0.content', 'Pelo que sou grato?')
                ->missing('prompts.0.data')
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
        Carbon::setTestNow('2026-05-10');
        $user = User::factory()->create(['timezone' => 'UTC']);
        JournalEntry::factory()->create(['user_id' => $user->id, 'date' => '2026-05-10']);

        $this->actingAs($user)
            ->post('/journal', ['date' => '2026-05-10', 'content' => '<p>Duplicado.</p>'])
            ->assertRedirect()
            ->assertSessionHasErrors('date');
    }

    public function test_cannot_create_entry_for_a_past_date(): void
    {
        // Criação é restrita ao "hoje" do usuário; dias passados sem entrada não
        // podem ser criados (só via "Escrever hoje").
        Carbon::setTestNow('2026-05-10');
        $user = User::factory()->create(['timezone' => 'UTC']);

        $this->actingAs($user)
            ->post('/journal', ['date' => '2026-05-09', 'content' => '<p>Ontem.</p>'])
            ->assertRedirect()
            ->assertSessionHasErrors('date');

        $this->assertDatabaseMissing('journal_entries', ['date' => '2026-05-09']);
    }

    public function test_store_persists_and_normalizes_tags(): void
    {
        Carbon::setTestNow('2026-05-10');
        $user = User::factory()->create(['timezone' => 'UTC']);

        $this->actingAs($user)
            ->post('/journal', [
                'date'    => '2026-05-10',
                'content' => '<p>Com etiquetas.</p>',
                'tags'    => ['Gratidão', ' Gratidão ', 'Insight', ''],
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $entry = JournalEntry::where('user_id', $user->id)->first();
        // trim + dedup + descarta vazias
        $this->assertEquals(['Gratidão', 'Insight'], $entry->tags);
    }

    public function test_update_persists_tags(): void
    {
        $user  = User::factory()->create();
        $entry = JournalEntry::factory()->create(['user_id' => $user->id, 'tags' => []]);

        $this->actingAs($user)
            ->patch("/journal/{$entry->id}", ['content' => '<p>x</p>', 'tags' => ['Evento', 'Sonho']])
            ->assertRedirect();

        $entry->refresh();
        $this->assertEquals(['Evento', 'Sonho'], $entry->tags);
    }
}
