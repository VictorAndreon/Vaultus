# Capas de livro (upload + download por URL) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir definir a capa de um livro por upload de arquivo ou por URL (servidor baixa e guarda local), servindo a imagem same-origin para passar na CSP.

**Architecture:** A imagem é normalizada (GD → WebP, lado maior ≤ 600px) e salva no disco `public` em `covers/{userId}/{uuid}.webp`. É servida por uma rota Laravel autorizada (`GET /library/{libraryItem}/cover`), evitando `storage:link` (o Caddy monta `src/public` read-only e não enxerga `src/storage`). Um `BookCoverService` concentra processamento, download seguro (proteção SSRF) e remoção. A coluna `cover_path` guarda o arquivo local; `cover_url` é mantida para legado externo.

**Tech Stack:** Laravel 11 (PHP 8.4, GD), Inertia.js + React 19 + TS, PHPUnit, Docker.

**Execução:** tudo via container `app`/`node`. Testes: `docker compose exec -T app php artisan test`. Build: `docker compose --profile dev run --rm node sh -c "npm run build"`. Branch já criada: `feature/library-capas-upload`.

---

## Estrutura de arquivos

- **Criar:**
  - `src/database/migrations/2026_06_02_000001_add_cover_path_to_library_items.php` — coluna `cover_path`.
  - `src/app/Domains/Library/Services/BookCoverService.php` — processar/baixar/remover capa.
  - `src/tests/Feature/Library/BookCoverServiceTest.php` — testes do service.
  - `src/tests/Feature/Library/BookCoverFlowTest.php` — testes de rota + store/update.
- **Modificar:**
  - `src/app/Domains/Library/Models/LibraryItem.php` — `cover_path` em fillable + accessor `cover_display_url`.
  - `src/routes/web.php` — rota `library.cover`.
  - `src/app/Domains/Library/Controllers/LibraryController.php` — validação, `resolveCover`, `cover()`, payload.
  - `src/resources/js/Pages/Library/components/LibraryModal.tsx` — input de arquivo, preview, remover, payload.
  - `src/resources/js/Pages/Library/Index.tsx` — `onError` nos `<img>`.

---

## Task 1: Migration — coluna `cover_path`

**Files:**
- Create: `src/database/migrations/2026_06_02_000001_add_cover_path_to_library_items.php`
- Modify: `src/app/Domains/Library/Models/LibraryItem.php`
- Test: `src/tests/Feature/Library/BookCoverFlowTest.php`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/tests/Feature/Library/BookCoverFlowTest.php`:

```php
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
        $item = LibraryItem::create([
            'user_id' => $user->id, 'type' => 'book', 'title' => 'Capa local',
            'status' => 'queue', 'cover_path' => 'covers/1/abc.webp',
        ]);

        $this->assertDatabaseHas('library_items', [
            'id' => $item->id, 'cover_path' => 'covers/1/abc.webp',
        ]);
    }
}
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `docker compose exec -T app php artisan test --filter test_cover_path_is_persisted`
Expected: FAIL — coluna `cover_path` não existe / atributo não preenchível.

- [ ] **Step 3: Criar a migration**

Criar `src/database/migrations/2026_06_02_000001_add_cover_path_to_library_items.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('library_items', function (Blueprint $table) {
            $table->string('cover_path')->nullable()->after('cover_url');
        });
    }

    public function down(): void
    {
        Schema::table('library_items', function (Blueprint $table) {
            $table->dropColumn('cover_path');
        });
    }
};
```

- [ ] **Step 4: Adicionar `cover_path` ao fillable do model**

Em `src/app/Domains/Library/Models/LibraryItem.php`, no array `$fillable`, trocar a linha:

```php
        'total_pages', 'current_page', 'cover_url',
```

por:

```php
        'total_pages', 'current_page', 'cover_url', 'cover_path',
```

- [ ] **Step 5: Migrar e rodar o teste**

Run: `docker compose exec -T app php artisan migrate && docker compose exec -T app php artisan test --filter test_cover_path_is_persisted`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/database/migrations/2026_06_02_000001_add_cover_path_to_library_items.php src/app/Domains/Library/Models/LibraryItem.php src/tests/Feature/Library/BookCoverFlowTest.php
git commit -m "feat(library): coluna cover_path para capas locais"
```

---

## Task 2: Rota e entrega da capa + accessor `cover_display_url`

**Files:**
- Modify: `src/routes/web.php`
- Modify: `src/app/Domains/Library/Models/LibraryItem.php`
- Modify: `src/app/Domains/Library/Controllers/LibraryController.php`
- Test: `src/tests/Feature/Library/BookCoverFlowTest.php`

- [ ] **Step 1: Escrever os testes que falham**

Adicionar em `src/tests/Feature/Library/BookCoverFlowTest.php` (dentro da classe). Note o `use` no topo do arquivo: adicionar `use Illuminate\Support\Facades\Storage;`.

```php
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter BookCoverFlowTest`
Expected: FAIL — rota `library.cover` e accessor inexistentes.

- [ ] **Step 3: Adicionar a rota**

Em `src/routes/web.php`, logo após a linha `Route::get('/library', [LibraryController::class, 'index'])->name('library');`, inserir:

```php
    Route::get('/library/{libraryItem}/cover', [LibraryController::class, 'cover'])->name('library.cover');
```

- [ ] **Step 4: Adicionar o accessor no model**

Em `src/app/Domains/Library/Models/LibraryItem.php`, adicionar o accessor (após `getProgressPercentAttribute`). Usa o helper global `route()`, sem novos imports:

```php
    public function getCoverDisplayUrlAttribute(): ?string
    {
        if ($this->cover_path) {
            return route('library.cover', $this->id);
        }

        return $this->cover_url;
    }
```

- [ ] **Step 5: Adicionar a action `cover()` no controller e usar o accessor no payload**

Em `src/app/Domains/Library/Controllers/LibraryController.php`, adicionar o import no topo (após os `use` existentes):

```php
use Illuminate\Support\Facades\Storage;
```

No método `bookPayload`, trocar a linha:

```php
            'cover_url'        => $b->cover_url,
```

por:

```php
            'cover_url'        => $b->cover_display_url,
```

Adicionar a action (após o método `index`):

```php
    public function cover(Request $request, LibraryItem $libraryItem)
    {
        abort_if($libraryItem->user_id !== $request->user()->id, 403);
        abort_if(! $libraryItem->cover_path || ! Storage::disk('public')->exists($libraryItem->cover_path), 404);

        return Storage::disk('public')->response($libraryItem->cover_path, null, [
            'Cache-Control' => 'private, max-age=86400',
        ]);
    }
```

- [ ] **Step 6: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter BookCoverFlowTest`
Expected: PASS (4 testes desta task + o da Task 1)

- [ ] **Step 7: Commit**

```bash
git add src/routes/web.php src/app/Domains/Library/Models/LibraryItem.php src/app/Domains/Library/Controllers/LibraryController.php src/tests/Feature/Library/BookCoverFlowTest.php
git commit -m "feat(library): rota autorizada de entrega da capa + cover_display_url"
```

---

## Task 3: `BookCoverService::fromUpload` (processar e armazenar)

**Files:**
- Create: `src/app/Domains/Library/Services/BookCoverService.php`
- Test: `src/tests/Feature/Library/BookCoverServiceTest.php`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/tests/Feature/Library/BookCoverServiceTest.php`:

```php
<?php

namespace Tests\Feature\Library;

use App\Domains\Library\Services\BookCoverService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BookCoverServiceTest extends TestCase
{
    public function test_from_upload_stores_resized_webp(): void
    {
        Storage::fake('public');
        $service = new BookCoverService();

        // imagem fake 1200x1500 (precisa de GD, disponível no container)
        $file = UploadedFile::fake()->image('cover.jpg', 1200, 1500);

        $path = $service->fromUpload($file, 7);

        $this->assertStringStartsWith('covers/7/', $path);
        $this->assertStringEndsWith('.webp', $path);
        Storage::disk('public')->assertExists($path);

        $info = getimagesizefromstring(Storage::disk('public')->get($path));
        $this->assertNotFalse($info);
        $this->assertLessThanOrEqual(600, max($info[0], $info[1])); // lado maior ≤ 600
    }
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter test_from_upload_stores_resized_webp`
Expected: FAIL — classe `BookCoverService` inexistente.

- [ ] **Step 3: Criar o service (fromUpload + processAndStore + delete)**

Criar `src/app/Domains/Library/Services/BookCoverService.php`:

```php
<?php

namespace App\Domains\Library\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BookCoverService
{
    private const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
    private const MAX_EDGE  = 600;             // lado maior em px
    private const DISK      = 'public';

    public function fromUpload(UploadedFile $file, int $userId): string
    {
        $binary = file_get_contents($file->getRealPath());

        if ($binary === false) {
            throw ValidationException::withMessages([
                'cover_file' => 'Não foi possível ler o arquivo enviado.',
            ]);
        }

        return $this->processAndStore($binary, $userId, 'cover_file');
    }

    public function delete(?string $path): void
    {
        if ($path && Storage::disk(self::DISK)->exists($path)) {
            Storage::disk(self::DISK)->delete($path);
        }
    }

    private function processAndStore(string $binary, int $userId, string $field): string
    {
        $image = @imagecreatefromstring($binary);

        if ($image === false) {
            throw ValidationException::withMessages([
                $field => 'O arquivo não é uma imagem válida.',
            ]);
        }

        $width  = imagesx($image);
        $height = imagesy($image);
        $scale  = min(1, self::MAX_EDGE / max($width, $height));
        $newW   = max(1, (int) round($width * $scale));
        $newH   = max(1, (int) round($height * $scale));

        $resized = imagecreatetruecolor($newW, $newH);
        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        imagecopyresampled($resized, $image, 0, 0, 0, 0, $newW, $newH, $width, $height);

        ob_start();
        imagewebp($resized, null, 80);
        $webp = (string) ob_get_clean();

        imagedestroy($image);
        imagedestroy($resized);

        $path = sprintf('covers/%d/%s.webp', $userId, Str::uuid());
        Storage::disk(self::DISK)->put($path, $webp);

        return $path;
    }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter test_from_upload_stores_resized_webp`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/Domains/Library/Services/BookCoverService.php src/tests/Feature/Library/BookCoverServiceTest.php
git commit -m "feat(library): BookCoverService processa upload em WebP redimensionado"
```

---

## Task 4: `BookCoverService::fromUrl` (download seguro com proteção SSRF)

**Files:**
- Modify: `src/app/Domains/Library/Services/BookCoverService.php`
- Test: `src/tests/Feature/Library/BookCoverServiceTest.php`

- [ ] **Step 1: Escrever os testes que falham**

Adicionar em `src/tests/Feature/Library/BookCoverServiceTest.php` o import no topo:

```php
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
```

E os métodos (dentro da classe). `pngBytes()` gera uma imagem real via GD para o `Http::fake`. Usamos um IP público literal (`93.184.216.34`) para evitar DNS nos testes:

```php
    private function pngBytes(int $w = 100, int $h = 120): string
    {
        $im = imagecreatetruecolor($w, $h);
        ob_start();
        imagepng($im);
        $bytes = (string) ob_get_clean();
        imagedestroy($im);

        return $bytes;
    }

    public function test_from_url_downloads_and_stores(): void
    {
        Storage::fake('public');
        Http::fake(['http://93.184.216.34/*' => Http::response($this->pngBytes(), 200, ['Content-Type' => 'image/png'])]);

        $path = (new BookCoverService())->fromUrl('http://93.184.216.34/cover.png', 7);

        Storage::disk('public')->assertExists($path);
        $this->assertStringEndsWith('.webp', $path);
    }

    public function test_from_url_rejects_non_image(): void
    {
        Storage::fake('public');
        Http::fake(['http://93.184.216.34/*' => Http::response('isto não é imagem', 200)]);

        $this->expectException(ValidationException::class);
        (new BookCoverService())->fromUrl('http://93.184.216.34/x.png', 7);
    }

    public function test_from_url_blocks_private_ip_ssrf(): void
    {
        $this->expectException(ValidationException::class);
        // 169.254.169.254 = endpoint de metadados em nuvens (alvo clássico de SSRF)
        (new BookCoverService())->fromUrl('http://169.254.169.254/latest/meta-data', 7);
    }

    public function test_from_url_rejects_oversize(): void
    {
        Http::fake(['http://93.184.216.34/*' => Http::response('x', 200, ['Content-Length' => (string) (6 * 1024 * 1024)])]);

        $this->expectException(ValidationException::class);
        (new BookCoverService())->fromUrl('http://93.184.216.34/big.png', 7);
    }
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter test_from_url`
Expected: FAIL — método `fromUrl` inexistente.

- [ ] **Step 3: Implementar `fromUrl`, `downloadSafely` e `assertPublicHost`**

Em `src/app/Domains/Library/Services/BookCoverService.php`, adicionar o import no topo:

```php
use Illuminate\Support\Facades\Http;
```

E adicionar os métodos (após `fromUpload`):

```php
    public function fromUrl(string $url, int $userId): string
    {
        $binary = $this->downloadSafely($url);

        return $this->processAndStore($binary, $userId, 'cover_url');
    }

    private function downloadSafely(string $url): string
    {
        $parts  = parse_url($url);
        $scheme = strtolower($parts['scheme'] ?? '');

        if (! in_array($scheme, ['http', 'https'], true) || empty($parts['host'])) {
            throw ValidationException::withMessages([
                'cover_url' => 'A URL da capa deve começar com http:// ou https://.',
            ]);
        }

        $this->assertPublicHost($parts['host']);

        try {
            $response = Http::connectTimeout(5)
                ->timeout(10)
                ->withOptions(['allow_redirects' => false]) // redirect p/ host interno burlaria o guard
                ->get($url);
        } catch (\Throwable) {
            throw ValidationException::withMessages([
                'cover_url' => 'Não foi possível baixar a imagem dessa URL.',
            ]);
        }

        if (! $response->successful()) {
            throw ValidationException::withMessages([
                'cover_url' => 'Não foi possível baixar a imagem dessa URL.',
            ]);
        }

        if ((int) $response->header('Content-Length') > self::MAX_BYTES) {
            throw ValidationException::withMessages([
                'cover_url' => 'A imagem excede o limite de 5 MB.',
            ]);
        }

        $body = $response->body();

        if ($body === '' || strlen($body) > self::MAX_BYTES) {
            throw ValidationException::withMessages([
                'cover_url' => 'A imagem está vazia ou excede o limite de 5 MB.',
            ]);
        }

        return $body;
    }

    private function assertPublicHost(string $host): void
    {
        $ips = filter_var($host, FILTER_VALIDATE_IP)
            ? [$host]
            : (gethostbynamel($host) ?: []);

        if (empty($ips)) {
            throw ValidationException::withMessages([
                'cover_url' => 'Não foi possível resolver o endereço da imagem.',
            ]);
        }

        foreach ($ips as $ip) {
            if (! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                throw ValidationException::withMessages([
                    'cover_url' => 'Essa URL aponta para um endereço não permitido.',
                ]);
            }
        }
    }
```

- [ ] **Step 4: Rodar e ver passar**

Run: `docker compose exec -T app php artisan test --filter BookCoverServiceTest`
Expected: PASS (5 testes)

- [ ] **Step 5: Commit**

```bash
git add src/app/Domains/Library/Services/BookCoverService.php src/tests/Feature/Library/BookCoverServiceTest.php
git commit -m "feat(library): BookCoverService baixa capa por URL com proteção SSRF"
```

---

## Task 5: Controller — resolver capa em store/update

**Files:**
- Modify: `src/app/Domains/Library/Controllers/LibraryController.php`
- Test: `src/tests/Feature/Library/BookCoverFlowTest.php`

- [ ] **Step 1: Escrever os testes que falham**

Adicionar em `src/tests/Feature/Library/BookCoverFlowTest.php` os imports no topo:

```php
use App\Domains\Library\Services\BookCoverService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
```

E os métodos (dentro da classe):

```php
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `docker compose exec -T app php artisan test --filter BookCoverFlowTest`
Expected: FAIL — store/update ainda não tratam cover_file/cover_url/remove_cover (cover_path fica null / arquivo antigo não removido).

- [ ] **Step 3: Atualizar validação, store, update e adicionar `resolveCover`**

Em `src/app/Domains/Library/Controllers/LibraryController.php`, adicionar o import no topo:

```php
use App\Domains\Library\Services\BookCoverService;
```

Trocar a assinatura/corpo de `store`:

```php
    public function store(Request $request, BookCoverService $covers): RedirectResponse
    {
        $data = $this->validatedData($request);
        $data = array_merge($data, $this->resolveCover($request, $covers, null));

        LibraryItem::create(array_merge([
            'user_id' => $request->user()->id,
            'type'    => 'book',
        ], $data));

        return redirect()->route('library')->with('success', 'Livro adicionado.');
    }
```

Trocar a assinatura/corpo de `update`:

```php
    public function update(Request $request, LibraryItem $libraryItem, BookCoverService $covers): RedirectResponse
    {
        abort_if($libraryItem->user_id !== $request->user()->id, 403);

        $data = $this->validatedData($request);
        $data = array_merge($data, $this->resolveCover($request, $covers, $libraryItem));

        $libraryItem->update($data);

        return redirect()->route('library')->with('success', 'Livro atualizado.');
    }
```

No método `validatedData`, dentro do array de regras de `$request->validate([...])`, logo após a linha `'cover_url'    => 'nullable|url|max:1024',`, inserir:

```php
            'cover_file'   => 'nullable|image|mimes:jpeg,png,webp,gif|max:5120',
            'remove_cover' => 'nullable|boolean',
```

Ainda em `validatedData`, antes do `return $validated;` final, inserir (campos de capa são resolvidos à parte, não são colunas diretas):

```php
        unset($validated['cover_url'], $validated['cover_file'], $validated['remove_cover']);
```

Adicionar o método privado `resolveCover` (no fim da classe, antes da chave de fechamento):

```php
    /**
     * Resolve a capa a partir do request, na ordem: arquivo enviado > nova URL >
     * remover > manter. Em troca/remoção, apaga o arquivo antigo.
     *
     * @return array<string, string|null>
     */
    private function resolveCover(Request $request, BookCoverService $covers, ?LibraryItem $existing): array
    {
        $old = $existing?->cover_path;

        if ($request->hasFile('cover_file')) {
            $path = $covers->fromUpload($request->file('cover_file'), $request->user()->id);
            $covers->delete($old);

            return ['cover_path' => $path, 'cover_url' => null];
        }

        $url = $request->input('cover_url');
        if (filled($url)) {
            $path = $covers->fromUrl($url, $request->user()->id);
            $covers->delete($old);

            return ['cover_path' => $path, 'cover_url' => null];
        }

        if ($request->boolean('remove_cover')) {
            $covers->delete($old);

            return ['cover_path' => null, 'cover_url' => null];
        }

        return []; // nenhum dos três → mantém a capa atual
    }
```

- [ ] **Step 4: Rodar e ver passar (suíte da Library inteira)**

Run: `docker compose exec -T app php artisan test --filter "BookCoverFlowTest|BookCoverServiceTest|LibraryTest"`
Expected: PASS (sem regressão no `LibraryTest` existente)

- [ ] **Step 5: Commit**

```bash
git add src/app/Domains/Library/Controllers/LibraryController.php src/tests/Feature/Library/BookCoverFlowTest.php
git commit -m "feat(library): store/update resolvem capa (upload, URL, remover, manter)"
```

---

## Task 6: Frontend — modal com upload, preview e remover

**Files:**
- Modify: `src/resources/js/Pages/Library/components/LibraryModal.tsx`

- [ ] **Step 1: Trocar o estado da capa**

Em `src/resources/js/Pages/Library/components/LibraryModal.tsx`, trocar a linha:

```tsx
  const [coverUrl, setCoverUrl] = useState(item?.cover_url ?? '')
```

por (o campo de URL começa vazio — é para uma URL NOVA; a capa atual aparece só na miniatura):

```tsx
  const [coverUrl, setCoverUrl] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(item?.cover_url ?? null)
  const [removeCover, setRemoveCover] = useState(false)
```

- [ ] **Step 2: Trocar a montagem do payload e as opções de envio**

No `submit`, trocar o bloco `const payload = { ... }` e as duas chamadas `router`:

```tsx
    const cover =
      coverFile ? { cover_file: coverFile } :
      coverUrl ? { cover_url: coverUrl } :
      removeCover ? { remove_cover: true } :
      {}

    const payload = {
      title,
      author: author || null,
      status,
      genre: genre || null,
      total_pages: totalPages ? Number(totalPages) : null,
      current_page: currentPage ? Number(currentPage) : null,
      rating: status === 'done' && rating ? Number(rating) : null,
      started_at: status !== 'queue' ? (startedAt || null) : null,
      finished_at: status === 'done' ? (finishedAt || null) : null,
      ...cover,
    }
    const opts = { preserveScroll: true, onSuccess: onClose, forceFormData: !!coverFile }
    if (isEdit) router.patch(`/library/${item!.id}`, payload, opts)
    else router.post('/library', payload, opts)
```

- [ ] **Step 3: Trocar o bloco de UI da capa**

Substituir o `<label>` da "Capa (URL)" (o bloco que contém `type="url"` com `placeholder="https://…"`, dentro do grid de Status/Capa) por este bloco autocontido (mantém o grid: Status fica na primeira coluna, e a capa passa a ocupar a sua própria linha logo abaixo). Concretamente: remover o `<label>` da Capa de dentro do grid Status/Capa, deixando só o Status nesse grid, e inserir o bloco abaixo logo após esse grid:

```tsx
        <label>
          <div className="kicker" style={{ marginBottom: 4 }}>Capa</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {coverPreview && !removeCover ? (
              <img src={coverPreview} alt="" style={{ width: 56, height: 80, objectFit: 'cover', borderRadius: 6, flex: 'none' }} />
            ) : (
              <div className="ph" style={{ width: 56, height: 80, flex: 'none' }} />
            )}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  setCoverFile(f)
                  setRemoveCover(false)
                  setCoverPreview(f ? URL.createObjectURL(f) : (item?.cover_url ?? null))
                }}
                style={{ fontSize: 12 }}
              />
              <input
                type="url"
                value={coverUrl}
                onChange={(e) => { setCoverUrl(e.target.value); setRemoveCover(false) }}
                placeholder="ou cole uma URL https://…"
                style={inputStyle}
                disabled={!!coverFile}
              />
              {(coverPreview || coverUrl || coverFile) && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ alignSelf: 'flex-start', color: 'var(--rose)' }}
                  onClick={() => { setCoverFile(null); setCoverUrl(''); setRemoveCover(true); setCoverPreview(null) }}
                >
                  Remover capa
                </button>
              )}
              {errors?.cover_file && <div style={errStyle}>{errors.cover_file}</div>}
              {errors?.cover_url && <div style={errStyle}>{errors.cover_url}</div>}
            </div>
          </div>
        </label>
```

E ajustar o grid que continha Status + Capa para conter apenas o Status (remover o `gridTemplateColumns: '1fr 1fr'` desse grid específico ou deixar o Status sozinho numa `<label>` simples). O resultado: Status em sua linha, Capa logo abaixo.

- [ ] **Step 4: Verificar o build**

Run: `docker compose --profile dev run --rm node sh -c "npm run build"`
Expected: `✓ built` sem erros. (Não há test runner de frontend; a verificação é o build.)

- [ ] **Step 5: Commit**

```bash
git add src/resources/js/Pages/Library/components/LibraryModal.tsx
git commit -m "feat(library): modal com upload de capa, preview e remover"
```

---

## Task 7: Frontend — fallback `onError` nas capas do Index

**Files:**
- Modify: `src/resources/js/Pages/Library/Index.tsx`

- [ ] **Step 1: Adicionar `onError` nos dois `<img>` de capa**

Em `src/resources/js/Pages/Library/Index.tsx`, nos dois `<img src={b.cover_url} ... />` (linhas ~78 e ~114), adicionar o handler que esconde a imagem quebrada (cai no fundo/placeholder do container):

No primeiro (lista "Em leitura"):

```tsx
                                            <img src={b.cover_url} alt={b.title} loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} style={{ width: 80, height: 120, objectFit: 'cover', borderRadius: 'var(--r-2)', flex: 'none' }} />
```

No segundo ("Concluídos · recentes"):

```tsx
                                        <img src={b.cover_url} alt={b.title} loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} style={{ width: 32, height: 46, objectFit: 'cover', borderRadius: 'var(--r-2)', flex: 'none' }} />
```

- [ ] **Step 2: Verificar o build**

Run: `docker compose --profile dev run --rm node sh -c "npm run build"`
Expected: `✓ built` sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/resources/js/Pages/Library/Index.tsx
git commit -m "fix(library): esconder capa quebrada no Index (onError)"
```

---

## Verificação final

- [ ] **Suíte completa sem regressão**

Run: `docker compose exec -T app php artisan test`
Expected: todos PASS (267 anteriores + ~11 novos).

- [ ] **Build de produção**

Run: `docker compose --profile dev run --rm node sh -c "npm run build"`
Expected: `✓ built`.

- [ ] **Teste manual (opcional)** em `https://vaultus.local/library`: adicionar livro com upload de arquivo; editar e trocar por URL; remover capa; confirmar que a imagem aparece (servida por `/library/{id}/cover`).

---

## Notas de decisão

- **Soft-delete:** `destroy` permanece inalterado (não apaga o arquivo da capa), respeitando a reversibilidade do soft-delete. Arquivos órfãos de itens removidos são desprezíveis num app pessoal. (Ajuste em relação ao spec, que mencionava limpeza no destroy.)
- **Limite de download:** com `Http::get` o corpo é lido por inteiro; o tamanho é barrado por `Content-Length` (quando presente) + `strlen` do corpo, e o `timeout(10)` limita downloads lentos. Suficiente para uso pessoal; não é um streaming-abort byte-a-byte.
- **DNS em testes:** `assertPublicHost` checa IPs literais diretamente (sem DNS); por isso os testes usam IPs literais (`93.184.216.34` público, `169.254.169.254`/`127.0.0.1` privados) e nunca tocam a rede.
- **CSP inalterada:** capas locais são servidas same-origin (`img-src 'self'`).
