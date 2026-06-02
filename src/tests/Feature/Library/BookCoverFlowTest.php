<?php

namespace Tests\Feature\Library;

use App\Domains\Auth\Models\User;
use App\Domains\Library\Models\LibraryItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookCoverFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_cover_path_is_persisted(): void
    {
        $user = User::factory()->create();
        $path = "covers/{$user->id}/abc.webp";
        $item = LibraryItem::create([
            'user_id' => $user->id, 'type' => 'book', 'title' => 'Capa local',
            'status' => 'queue', 'cover_path' => $path,
        ]);

        $this->assertDatabaseHas('library_items', [
            'id' => $item->id, 'cover_path' => $path,
        ]);
    }
}
