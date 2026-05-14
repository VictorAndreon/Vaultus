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
}
