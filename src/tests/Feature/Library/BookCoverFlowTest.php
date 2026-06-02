<?php

namespace Tests\Feature\Library;

use App\Domains\Auth\Models\User;
use App\Domains\Library\Models\LibraryItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
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

    public function test_cover_route_serves_image_to_owner(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $path = "covers/{$user->id}/x.webp";
        Storage::disk('public')->put($path, 'fake-bytes');
        $item = LibraryItem::create([
            'user_id' => $user->id, 'type' => 'book', 'title' => 'A',
            'status' => 'queue', 'cover_path' => $path,
        ]);

        $this->actingAs($user)->get("/library/{$item->id}/cover")->assertOk();
    }

    public function test_cover_route_forbids_other_user(): void
    {
        Storage::fake('public');
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $path = "covers/{$owner->id}/x.webp";
        Storage::disk('public')->put($path, 'fake-bytes');
        $item = LibraryItem::create([
            'user_id' => $owner->id, 'type' => 'book', 'title' => 'A',
            'status' => 'queue', 'cover_path' => $path,
        ]);

        $this->actingAs($other)->get("/library/{$item->id}/cover")->assertForbidden();
    }

    public function test_cover_route_404_without_path(): void
    {
        $user = User::factory()->create();
        $item = LibraryItem::create([
            'user_id' => $user->id, 'type' => 'book', 'title' => 'A', 'status' => 'queue',
        ]);

        $this->actingAs($user)->get("/library/{$item->id}/cover")->assertNotFound();
    }

    public function test_cover_route_404_when_file_missing_from_disk(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $item = LibraryItem::create([
            'user_id' => $user->id, 'type' => 'book', 'title' => 'A',
            'status' => 'queue', 'cover_path' => "covers/{$user->id}/x.webp",
            // arquivo intencionalmente NÃO gravado no disco
        ]);

        $this->actingAs($user)->get("/library/{$item->id}/cover")->assertNotFound();
    }

    public function test_display_url_prefers_local_route_then_external(): void
    {
        $user = User::factory()->create();
        $local = LibraryItem::create([
            'user_id' => $user->id, 'type' => 'book', 'title' => 'Local',
            'status' => 'queue', 'cover_path' => "covers/{$user->id}/x.webp",
        ]);
        $external = LibraryItem::create([
            'user_id' => $user->id, 'type' => 'book', 'title' => 'Ext',
            'status' => 'queue', 'cover_url' => 'https://x.test/c.jpg',
        ]);
        $none = LibraryItem::create([
            'user_id' => $user->id, 'type' => 'book', 'title' => 'None', 'status' => 'queue',
        ]);

        $this->assertSame(route('library.cover', $local->id), $local->cover_display_url);
        $this->assertSame('https://x.test/c.jpg', $external->cover_display_url);
        $this->assertNull($none->cover_display_url);
    }
}
