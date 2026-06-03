<?php

namespace Tests\Feature\Library;

use App\Domains\Auth\Models\User;
use App\Domains\Library\Models\LibraryItem;
use App\Domains\Library\Services\BookCoverService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
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

    public function test_store_with_uploaded_file_sets_cover_path(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->actingAs($user)->post('/library', [
            'title'      => 'Com upload',
            'status'     => 'queue',
            'cover_file' => UploadedFile::fake()->image('c.png', 800, 1000),
        ])->assertRedirect('/library');

        $item = LibraryItem::where('user_id', $user->id)->firstOrFail();
        $this->assertNotNull($item->cover_path);
        Storage::disk('public')->assertExists($item->cover_path);
    }

    public function test_store_with_url_downloads_cover(): void
    {
        Storage::fake('public');
        Http::fake(['http://93.184.216.34/*' => Http::response($this->pngBytes(), 200, ['Content-Type' => 'image/png'])]);
        $user = User::factory()->create();

        $this->actingAs($user)->post('/library', [
            'title'     => 'Com URL',
            'status'    => 'queue',
            'cover_url' => 'http://93.184.216.34/cover.png',
        ])->assertRedirect('/library');

        $item = LibraryItem::where('user_id', $user->id)->firstOrFail();
        $this->assertNotNull($item->cover_path);
        Storage::disk('public')->assertExists($item->cover_path);
    }

    public function test_update_replaces_and_deletes_old_cover(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $old  = "covers/{$user->id}/old.webp";
        Storage::disk('public')->put($old, 'old-bytes');
        $item = LibraryItem::create([
            'user_id' => $user->id, 'type' => 'book', 'title' => 'X',
            'status' => 'queue', 'cover_path' => $old,
        ]);

        $this->actingAs($user)->patch("/library/{$item->id}", [
            'title'      => 'X',
            'status'     => 'queue',
            'cover_file' => UploadedFile::fake()->image('new.png', 400, 600),
        ])->assertRedirect('/library');

        $item->refresh();
        $this->assertNotSame($old, $item->cover_path);
        Storage::disk('public')->assertMissing($old);
        Storage::disk('public')->assertExists($item->cover_path);
    }

    public function test_update_via_spoofed_post_uploads_cover(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $item = LibraryItem::create([
            'user_id' => $user->id, 'type' => 'book', 'title' => 'X', 'status' => 'queue',
        ]);

        // Fluxo real do frontend: PHP não parseia multipart em PATCH, então o Inertia
        // envia POST com _method=patch (method spoofing do Laravel roteia para update).
        $this->actingAs($user)->post("/library/{$item->id}", [
            '_method'    => 'patch',
            'title'      => 'X',
            'status'     => 'queue',
            'cover_file' => UploadedFile::fake()->image('c.png', 400, 600),
        ])->assertRedirect('/library');

        $item->refresh();
        $this->assertNotNull($item->cover_path);
        Storage::disk('public')->assertExists($item->cover_path);
    }

    public function test_update_remove_cover_clears_it(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $path = "covers/{$user->id}/c.webp";
        Storage::disk('public')->put($path, 'bytes');
        $item = LibraryItem::create([
            'user_id' => $user->id, 'type' => 'book', 'title' => 'X',
            'status' => 'queue', 'cover_path' => $path,
        ]);

        $this->actingAs($user)->patch("/library/{$item->id}", [
            'title' => 'X', 'status' => 'queue', 'remove_cover' => true,
        ])->assertRedirect('/library');

        $item->refresh();
        $this->assertNull($item->cover_path);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_update_without_cover_fields_keeps_cover(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $path = "covers/{$user->id}/c.webp";
        Storage::disk('public')->put($path, 'bytes');
        $item = LibraryItem::create([
            'user_id' => $user->id, 'type' => 'book', 'title' => 'X',
            'status' => 'queue', 'cover_path' => $path,
        ]);

        $this->actingAs($user)->patch("/library/{$item->id}", [
            'title' => 'Título novo', 'status' => 'queue',
        ])->assertRedirect('/library');

        $item->refresh();
        $this->assertSame($path, $item->cover_path);
        Storage::disk('public')->assertExists($path);
    }

    private function pngBytes(int $w = 100, int $h = 120): string
    {
        $im = imagecreatetruecolor($w, $h);
        ob_start();
        imagepng($im);
        $bytes = (string) ob_get_clean();
        imagedestroy($im);

        return $bytes;
    }
}
