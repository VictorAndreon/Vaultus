<?php

namespace Tests\Feature\Library;

use App\Domains\Auth\Models\User;
use App\Domains\Library\Models\LibraryItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LibraryTest extends TestCase
{
    use RefreshDatabase;

    public function test_library_page_requires_auth(): void
    {
        $this->get('/library')->assertRedirect('/login');
    }

    public function test_library_page_renders_with_correct_props(): void
    {
        $user = User::factory()->create();

        LibraryItem::create([
            'user_id' => $user->id, 'type' => 'book', 'title' => 'Livro A',
            'status' => 'reading', 'total_pages' => 300, 'current_page' => 90,
        ]);

        $this->actingAs($user)
            ->get('/library')
            ->assertStatus(200)
            ->assertInertia(fn($page) => $page
                ->component('Library/Index')
                ->has('reading')
                ->has('done_recent')
                ->has('queue')
                ->has('stats')
            );
    }

    public function test_library_reading_only_returns_reading_status(): void
    {
        $user = User::factory()->create();

        LibraryItem::create([
            'user_id' => $user->id, 'type' => 'book', 'title' => 'Lendo',
            'status' => 'reading', 'total_pages' => 200, 'current_page' => 50,
        ]);
        LibraryItem::create([
            'user_id' => $user->id, 'type' => 'book', 'title' => 'Na fila',
            'status' => 'queue',
        ]);

        $this->actingAs($user)
            ->get('/library')
            ->assertInertia(fn($page) => $page
                ->has('reading', 1)
                ->has('queue', 1)
            );
    }

    public function test_store_creates_a_book(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/library', [
                'title'  => 'Sapiens',
                'author' => 'Yuval Harari',
                'status' => 'reading',
            ])
            ->assertRedirect('/library');

        $this->assertDatabaseHas('library_items', [
            'user_id' => $user->id, 'type' => 'book',
            'title' => 'Sapiens', 'status' => 'reading',
        ]);
    }

    public function test_store_done_without_finished_at_defaults_to_today(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/library', ['title' => 'Done', 'status' => 'done']);

        $this->assertDatabaseHas('library_items', [
            'title' => 'Done', 'status' => 'done',
            'finished_at' => now()->toDateString(),
        ]);
    }

    public function test_store_rejects_current_page_greater_than_total(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/library', [
                'title' => 'X', 'status' => 'reading',
                'total_pages' => 100, 'current_page' => 150,
            ])
            ->assertSessionHasErrors('current_page');

        $this->assertDatabaseMissing('library_items', ['title' => 'X']);
    }

    public function test_store_accepts_abandoned_status(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/library', ['title' => 'Largado', 'status' => 'abandoned'])
            ->assertRedirect('/library');

        $this->assertDatabaseHas('library_items', ['title' => 'Largado', 'status' => 'abandoned']);
    }

    public function test_update_changes_own_book(): void
    {
        $user = User::factory()->create();
        $book = LibraryItem::create([
            'user_id' => $user->id, 'type' => 'book', 'title' => 'Antigo',
            'status' => 'queue',
        ]);

        $this->actingAs($user)
            ->patch("/library/{$book->id}", [
                'title' => 'Novo', 'status' => 'reading', 'current_page' => 10, 'total_pages' => 300,
            ])
            ->assertRedirect('/library');

        $this->assertDatabaseHas('library_items', [
            'id' => $book->id, 'title' => 'Novo', 'status' => 'reading', 'current_page' => 10,
        ]);
    }

    public function test_update_forbidden_for_other_users_book(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $book = LibraryItem::create([
            'user_id' => $owner->id, 'type' => 'book', 'title' => 'Alheio', 'status' => 'reading',
        ]);

        $this->actingAs($other)
            ->patch("/library/{$book->id}", ['title' => 'Hack', 'status' => 'reading'])
            ->assertForbidden();

        $this->assertDatabaseHas('library_items', ['id' => $book->id, 'title' => 'Alheio']);
    }

    public function test_destroy_soft_deletes_own_book(): void
    {
        $user = User::factory()->create();
        $book = LibraryItem::create([
            'user_id' => $user->id, 'type' => 'book', 'title' => 'Apagar', 'status' => 'queue',
        ]);

        $this->actingAs($user)
            ->delete("/library/{$book->id}")
            ->assertRedirect('/library');

        $this->assertSoftDeleted('library_items', ['id' => $book->id]);
    }

    public function test_destroy_forbidden_for_other_users_book(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $book = LibraryItem::create([
            'user_id' => $owner->id, 'type' => 'book', 'title' => 'Alheio', 'status' => 'queue',
        ]);

        $this->actingAs($other)
            ->delete("/library/{$book->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('library_items', ['id' => $book->id, 'deleted_at' => null]);
    }

    public function test_index_returns_abandoned_list_and_editable_fields(): void
    {
        $user = User::factory()->create();
        LibraryItem::create([
            'user_id' => $user->id, 'type' => 'book', 'title' => 'Largado',
            'status' => 'abandoned', 'total_pages' => 200, 'current_page' => 40,
            'started_at' => '2026-05-01',
        ]);
        LibraryItem::create([
            'user_id' => $user->id, 'type' => 'book', 'title' => 'Lendo',
            'status' => 'reading', 'total_pages' => 300, 'current_page' => 90,
            'started_at' => '2026-05-10',
        ]);

        $this->actingAs($user)
            ->get('/library')
            ->assertInertia(fn($page) => $page
                ->has('abandoned', 1)
                ->where('abandoned.0.title', 'Largado')
                ->where('abandoned.0.current_page', 40)
                ->where('reading.0.status', 'reading')
                ->where('reading.0.started_at', '2026-05-10')
            );
    }

    public function test_done_finished_at_uses_user_timezone_not_utc(): void
    {
        // Em UTC já é 02/06 01:30; em São Paulo (UTC-3) ainda é 01/06 22:30.
        $user = User::factory()->create(['timezone' => 'America/Sao_Paulo']);

        $this->travelTo(\Illuminate\Support\Carbon::parse('2026-06-02 01:30:00', 'UTC'), function () use ($user) {
            $this->actingAs($user)->post('/library', ['title' => 'TZ', 'status' => 'done']);
        });

        // Deve gravar a data LOCAL do usuário (01/06), não a data UTC (02/06).
        $this->assertDatabaseHas('library_items', ['title' => 'TZ', 'finished_at' => '2026-06-01']);
    }
}
