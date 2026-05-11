# Phase 3 — Diário Pessoal

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o módulo de diário com editor Tiptap, auto-save por debounce, navegação via calendário + lista, prompts customizáveis e integração com métricas de saúde da Fase 2.

**Architecture:** Sem migrations novas (tabelas já existem da Fase 0). `JournalEntry.content` usa `EncryptedCast` existente em `App\Shared\Casts`. `Index.tsx` gerencia `selectedDate` — quando definido exibe editor, quando nulo exibe calendário+lista. Auto-save usa debounce de 800ms: POST na primeira gravação (retorna entry com ID via Inertia props), PATCH nas subsequentes.

**Tech Stack:** Laravel 11, PHP 8.4, Inertia.js 2, React 19, TypeScript, Tailwind CSS 3, Tiptap 2, PHPUnit, Vite, Docker via `sg docker -c "docker compose ..."`.

---

## Estado ao Iniciar

- **Branch:** `master` (Fase 2 já mergeada)
- **Docker:** `sg docker -c "docker compose up -d"` a partir de `src/`
- **Migrations:** `journal_entries` e `journal_prompts` já existem — nenhuma nova necessária
- **Rota stub de `/journal`:** existe no `$stubs` de `routes/web.php` — será substituída neste plano
- **`EncryptedCast`:** `src/app/Shared/Casts/EncryptedCast.php` — já implementado
- **Tiptap:** ainda NÃO instalado no `package.json`

## Comandos Docker

```bash
cd src/
sg docker -c "docker compose up -d"
sg docker -c "docker compose run --rm app php artisan ..."
sg docker -c "docker compose run --rm node npm ..."
```

---

## Mapa de Arquivos

### Criar
| Arquivo | Responsabilidade |
|---|---|
| `src/app/Domains/Journal/Models/JournalEntry.php` | Model com EncryptedCast, scope forDate |
| `src/app/Domains/Journal/Models/JournalPrompt.php` | Model com scope active() |
| `src/database/factories/JournalEntryFactory.php` | Factory |
| `src/database/factories/JournalPromptFactory.php` | Factory |
| `src/app/Domains/Journal/Controllers/JournalEntryController.php` | index, store, update |
| `src/app/Domains/Journal/Controllers/JournalPromptController.php` | store, update, destroy |
| `src/app/Http/Resources/JournalEntryResource.php` | Serialização com preview, mood, energy |
| `src/app/Http/Resources/JournalPromptResource.php` | Serialização simples |
| `src/tests/Feature/Journal/JournalEntryTest.php` | Feature tests entradas |
| `src/tests/Feature/Journal/JournalPromptTest.php` | Feature tests prompts |
| `src/resources/js/Pages/Journal/Index.tsx` | Página principal |
| `src/resources/js/Pages/Journal/components/JournalCalendar.tsx` | Calendário mensal sem lib |
| `src/resources/js/Pages/Journal/components/EntryList.tsx` | Lista cronológica reversa |
| `src/resources/js/Pages/Journal/components/EntryEditor.tsx` | Editor Tiptap com auto-save |
| `src/resources/js/Pages/Journal/components/PromptsPanel.tsx` | Cards de prompts colapsáveis |
| `src/resources/js/Pages/Journal/components/PromptManager.tsx` | Modal CRUD de prompts |

### Modificar
| Arquivo | O que muda |
|---|---|
| `src/routes/web.php` | Remover `journal` dos stubs, adicionar 6 rotas reais |
| `src/app/Domains/Auth/Models/User.php` | Adicionar `journalEntries()` e `journalPrompts()` |
| `src/app/Domains/Dashboard/Services/DashboardAggregator.php` | Substituir `journal_streak: 0` por `journal_entries_this_month` |
| `src/resources/js/Pages/Dashboard/Index.tsx` | Atualizar tipo da prop stats |
| `src/resources/js/Pages/Dashboard/widgets/QuickStats.tsx` | Exibir `journal_entries_this_month` |
| `src/resources/js/types/index.d.ts` | Adicionar `JournalEntry`, `JournalPrompt` |

---

## Task 1: Instalar Tiptap

**Files:**
- Modify: `src/package.json` (via npm install)

- [ ] **Passo 1: Instalar pacotes Tiptap**

```bash
cd src/
sg docker -c "docker compose run --rm node npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-heading"
```

Esperado: saída com `added N packages`, sem erros.

- [ ] **Passo 2: Verificar instalação**

```bash
cd src/
sg docker -c "docker compose run --rm node node -e \"require('@tiptap/react'); console.log('ok')\""
```

Esperado: `ok`

- [ ] **Passo 3: Commit**

```bash
cd src/
git add package.json package-lock.json
git commit -m "chore: install Tiptap editor packages"
```

---

## Task 2: Models e Factories

**Files:**
- Create: `src/app/Domains/Journal/Models/JournalEntry.php`
- Create: `src/app/Domains/Journal/Models/JournalPrompt.php`
- Create: `src/database/factories/JournalEntryFactory.php`
- Create: `src/database/factories/JournalPromptFactory.php`

- [ ] **Passo 1: Criar diretórios necessários**

```bash
mkdir -p src/app/Domains/Journal/Models
mkdir -p src/app/Domains/Journal/Controllers
mkdir -p src/tests/Feature/Journal
mkdir -p src/resources/js/Pages/Journal/components
```

- [ ] **Passo 2: Criar `JournalEntry.php`**

```php
<?php
// src/app/Domains/Journal/Models/JournalEntry.php

namespace App\Domains\Journal\Models;

use App\Domains\Auth\Models\User;
use App\Domains\Habits\Models\HealthMetric;
use App\Shared\Casts\EncryptedCast;
use Database\Factories\JournalEntryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class JournalEntry extends Model
{
    use HasFactory, SoftDeletes;

    protected static function newFactory(): JournalEntryFactory
    {
        return JournalEntryFactory::new();
    }

    protected $fillable = ['user_id', 'date', 'content', 'tags', 'health_metric_id'];

    protected function casts(): array
    {
        return [
            'date'    => 'date',
            'tags'    => 'array',
            'content' => EncryptedCast::class,
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function healthMetric()
    {
        return $this->belongsTo(HealthMetric::class);
    }

    public function scopeForDate($query, string $date)
    {
        return $query->whereDate('date', $date);
    }
}
```

- [ ] **Passo 3: Criar `JournalPrompt.php`**

```php
<?php
// src/app/Domains/Journal/Models/JournalPrompt.php

namespace App\Domains\Journal\Models;

use App\Domains\Auth\Models\User;
use Database\Factories\JournalPromptFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JournalPrompt extends Model
{
    use HasFactory;

    protected static function newFactory(): JournalPromptFactory
    {
        return JournalPromptFactory::new();
    }

    protected $fillable = ['user_id', 'content', 'is_active', 'position'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'position'  => 'integer',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true)->orderBy('position');
    }
}
```

- [ ] **Passo 4: Criar `JournalEntryFactory.php`**

```php
<?php
// src/database/factories/JournalEntryFactory.php

namespace Database\Factories;

use App\Domains\Auth\Models\User;
use App\Domains\Journal\Models\JournalEntry;
use Illuminate\Database\Eloquent\Factories\Factory;

class JournalEntryFactory extends Factory
{
    protected $model = JournalEntry::class;

    public function definition(): array
    {
        return [
            'user_id'          => User::factory(),
            'date'             => today()->toDateString(),
            'content'          => '<p>' . fake()->paragraph() . '</p>',
            'tags'             => [],
            'health_metric_id' => null,
        ];
    }
}
```

- [ ] **Passo 5: Criar `JournalPromptFactory.php`**

```php
<?php
// src/database/factories/JournalPromptFactory.php

namespace Database\Factories;

use App\Domains\Auth\Models\User;
use App\Domains\Journal\Models\JournalPrompt;
use Illuminate\Database\Eloquent\Factories\Factory;

class JournalPromptFactory extends Factory
{
    protected $model = JournalPrompt::class;

    public function definition(): array
    {
        return [
            'user_id'   => User::factory(),
            'content'   => fake()->sentence(),
            'is_active' => true,
            'position'  => 0,
        ];
    }
}
```

- [ ] **Passo 6: Verificar que os models carregam**

```bash
cd src/
sg docker -c "docker compose run --rm app php artisan tinker --execute=\"echo App\Domains\Journal\Models\JournalEntry::count();\""
```

Esperado: `0` (sem erro de namespace).

- [ ] **Passo 7: Commit**

```bash
cd src/
git add app/Domains/Journal/Models/ database/factories/JournalEntryFactory.php database/factories/JournalPromptFactory.php
git commit -m "feat: add JournalEntry and JournalPrompt models with factories"
```

---

## Task 3: Resources

**Files:**
- Create: `src/app/Http/Resources/JournalEntryResource.php`
- Create: `src/app/Http/Resources/JournalPromptResource.php`

- [ ] **Passo 1: Criar `JournalEntryResource.php`**

```php
<?php
// src/app/Http/Resources/JournalEntryResource.php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JournalEntryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'date'             => $this->date->toDateString(),
            'content'          => $this->content,
            'tags'             => $this->tags ?? [],
            'health_metric_id' => $this->health_metric_id,
            'mood'             => $this->whenLoaded('healthMetric', fn() => $this->healthMetric?->mood),
            'energy'           => $this->whenLoaded('healthMetric', fn() => $this->healthMetric?->energy),
            'preview'          => $this->content
                ? mb_substr(strip_tags($this->content), 0, 100)
                : null,
        ];
    }
}
```

- [ ] **Passo 2: Criar `JournalPromptResource.php`**

```php
<?php
// src/app/Http/Resources/JournalPromptResource.php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JournalPromptResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'        => $this->id,
            'content'   => $this->content,
            'is_active' => $this->is_active,
            'position'  => $this->position,
        ];
    }
}
```

- [ ] **Passo 3: Commit**

```bash
cd src/
git add app/Http/Resources/JournalEntryResource.php app/Http/Resources/JournalPromptResource.php
git commit -m "feat: add JournalEntryResource and JournalPromptResource"
```

---

## Task 4: JournalEntryController + Feature Tests (TDD)

**Files:**
- Create: `src/app/Domains/Journal/Controllers/JournalEntryController.php`
- Create: `src/tests/Feature/Journal/JournalEntryTest.php`
- Create: `src/resources/js/Pages/Journal/Index.tsx` (stub mínimo)
- Modify: `src/routes/web.php`
- Modify: `src/app/Domains/Auth/Models/User.php`

- [ ] **Passo 1: Criar stub mínimo de `Journal/Index.tsx` (necessário para `assertInertia`)**

```tsx
// src/resources/js/Pages/Journal/Index.tsx
export default function Journal({ entries, prompts, today }: any) {
    return <div>Journal</div>
}
```

- [ ] **Passo 2: Adicionar relações ao `User.php`**

Editar `src/app/Domains/Auth/Models/User.php`, adicionar após `habits()`:

```php
    public function journalEntries()
    {
        return $this->hasMany(\App\Domains\Journal\Models\JournalEntry::class);
    }

    public function journalPrompts()
    {
        return $this->hasMany(\App\Domains\Journal\Models\JournalPrompt::class);
    }
```

- [ ] **Passo 3: Criar `JournalEntryTest.php`**

```php
<?php
// src/tests/Feature/Journal/JournalEntryTest.php

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

        // Verificar que o conteúdo foi salvo (descriptografado pelo model)
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
            ->assertStatus(422);
    }
}
```

- [ ] **Passo 4: Rodar e confirmar falhas (rotas não existem ainda)**

```bash
cd src/
sg docker -c "docker compose run --rm app php artisan test tests/Feature/Journal/JournalEntryTest.php --no-coverage"
```

Esperado: falhas por 404 / componente não encontrado.

- [ ] **Passo 5: Criar `JournalEntryController.php`**

```php
<?php
// src/app/Domains/Journal/Controllers/JournalEntryController.php

namespace App\Domains\Journal\Controllers;

use App\Domains\Journal\Models\JournalEntry;
use App\Http\Resources\JournalEntryResource;
use App\Http\Resources\JournalPromptResource;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;

class JournalEntryController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $entries = $user->journalEntries()
            ->with('healthMetric')
            ->latest('date')
            ->limit(90)
            ->get();

        $prompts = $user->journalPrompts()->active()->get();

        return Inertia::render('Journal/Index', [
            'entries' => JournalEntryResource::collection($entries),
            'prompts' => JournalPromptResource::collection($prompts),
            'today'   => Carbon::now($user->timezone)->toDateString(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'date'    => 'required|date_format:Y-m-d',
            'content' => 'nullable|string',
        ]);

        $request->user()->journalEntries()->create([
            'date'    => $validated['date'],
            'content' => $validated['content'] ?? '',
        ]);

        return back();
    }

    public function update(Request $request, JournalEntry $entry)
    {
        abort_if($entry->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'content' => 'nullable|string',
            'tags'    => 'sometimes|array',
            'tags.*'  => 'string|max:50',
        ]);

        $entry->update($validated);

        return back();
    }
}
```

- [ ] **Passo 6: Atualizar `routes/web.php`**

Substituir o conteúdo completo do arquivo:

```php
<?php

use App\Domains\Auth\Controllers\AuthController;
use App\Domains\Auth\Controllers\TwoFactorController;
use App\Domains\Dashboard\Controllers\DashboardController;
use App\Domains\Habits\Controllers\CheckInController;
use App\Domains\Habits\Controllers\HabitController;
use App\Domains\Habits\Controllers\HealthMetricController;
use App\Domains\Journal\Controllers\JournalEntryController;
use App\Domains\Journal\Controllers\JournalPromptController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/two-factor', [TwoFactorController::class, 'show'])->name('two-factor.show');
    Route::post('/two-factor', [TwoFactorController::class, 'verify'])->name('two-factor.verify');
});

Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Habits — /habits/health-metrics DEVE vir antes de /habits/{habit}
    Route::get('/habits', [HabitController::class, 'index'])->name('habits');
    Route::post('/habits', [HabitController::class, 'store']);
    Route::post('/habits/health-metrics', [HealthMetricController::class, 'store']);
    Route::patch('/habits/{habit}', [HabitController::class, 'update']);
    Route::delete('/habits/{habit}', [HabitController::class, 'destroy']);
    Route::post('/habits/{habit}/check-in', [CheckInController::class, 'store']);
    Route::delete('/habits/{habit}/check-in', [CheckInController::class, 'destroy']);

    // Journal — /journal/prompts DEVE vir antes de /journal/{entry}
    Route::get('/journal', [JournalEntryController::class, 'index'])->name('journal');
    Route::post('/journal', [JournalEntryController::class, 'store']);
    Route::post('/journal/prompts', [JournalPromptController::class, 'store']);
    Route::patch('/journal/prompts/{prompt}', [JournalPromptController::class, 'update']);
    Route::delete('/journal/prompts/{prompt}', [JournalPromptController::class, 'destroy']);
    Route::patch('/journal/{entry}', [JournalEntryController::class, 'update']);

    $stubs = ['tasks', 'projects', 'finance', 'library', 'notes', 'contacts', 'reviews'];
    foreach ($stubs as $module) {
        Route::get("/{$module}", fn() => Inertia::render('Stub/Index', ['module' => $module]))->name($module);
    }
});
```

- [ ] **Passo 7: Rodar testes e confirmar que passam**

```bash
cd src/
sg docker -c "docker compose run --rm app php artisan test tests/Feature/Journal/JournalEntryTest.php --no-coverage"
```

Esperado: 5 testes passando.

- [ ] **Passo 8: Commit**

```bash
cd src/
git add app/Domains/Journal/Controllers/JournalEntryController.php \
        app/Domains/Auth/Models/User.php \
        routes/web.php \
        resources/js/Pages/Journal/Index.tsx \
        tests/Feature/Journal/JournalEntryTest.php
git commit -m "feat: add JournalEntryController with CRUD and feature tests"
```

---

## Task 5: JournalPromptController + Feature Tests (TDD)

**Files:**
- Create: `src/app/Domains/Journal/Controllers/JournalPromptController.php`
- Create: `src/tests/Feature/Journal/JournalPromptTest.php`

- [ ] **Passo 1: Criar `JournalPromptTest.php`**

```php
<?php
// src/tests/Feature/Journal/JournalPromptTest.php

namespace Tests\Feature\Journal;

use App\Domains\Auth\Models\User;
use App\Domains\Journal\Models\JournalPrompt;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JournalPromptTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_prompt(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/journal/prompts', ['content' => 'O que te deixou grato hoje?'])
            ->assertRedirect();

        $this->assertDatabaseHas('journal_prompts', [
            'user_id' => $user->id,
            'content' => 'O que te deixou grato hoje?',
            'is_active' => true,
        ]);
    }

    public function test_can_edit_prompt(): void
    {
        $user   = User::factory()->create();
        $prompt = JournalPrompt::factory()->create(['user_id' => $user->id, 'content' => 'Antigo']);

        $this->actingAs($user)
            ->patch("/journal/prompts/{$prompt->id}", ['content' => 'Novo texto'])
            ->assertRedirect();

        $this->assertDatabaseHas('journal_prompts', ['id' => $prompt->id, 'content' => 'Novo texto']);
    }

    public function test_can_reorder_prompt(): void
    {
        $user   = User::factory()->create();
        $prompt = JournalPrompt::factory()->create(['user_id' => $user->id, 'position' => 0]);

        $this->actingAs($user)
            ->patch("/journal/prompts/{$prompt->id}", ['position' => 2])
            ->assertRedirect();

        $this->assertDatabaseHas('journal_prompts', ['id' => $prompt->id, 'position' => 2]);
    }

    public function test_can_delete_prompt(): void
    {
        $user   = User::factory()->create();
        $prompt = JournalPrompt::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->delete("/journal/prompts/{$prompt->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('journal_prompts', ['id' => $prompt->id]);
    }

    public function test_cannot_modify_other_users_prompt(): void
    {
        $owner  = User::factory()->create();
        $other  = User::factory()->create();
        $prompt = JournalPrompt::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($other)
            ->patch("/journal/prompts/{$prompt->id}", ['content' => 'Hackeado'])
            ->assertForbidden();
    }
}
```

- [ ] **Passo 2: Rodar e confirmar falhas**

```bash
cd src/
sg docker -c "docker compose run --rm app php artisan test tests/Feature/Journal/JournalPromptTest.php --no-coverage"
```

Esperado: 5 falhas (controller não existe).

- [ ] **Passo 3: Criar `JournalPromptController.php`**

```php
<?php
// src/app/Domains/Journal/Controllers/JournalPromptController.php

namespace App\Domains\Journal\Controllers;

use App\Domains\Journal\Models\JournalPrompt;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class JournalPromptController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'content' => 'required|string|max:500',
        ]);

        $request->user()->journalPrompts()->create([
            'content'   => $validated['content'],
            'is_active' => true,
            'position'  => 0,
        ]);

        return back();
    }

    public function update(Request $request, JournalPrompt $prompt)
    {
        abort_if($prompt->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'content'   => 'sometimes|string|max:500',
            'is_active' => 'sometimes|boolean',
            'position'  => 'sometimes|integer|min:0',
        ]);

        $prompt->update($validated);

        return back();
    }

    public function destroy(Request $request, JournalPrompt $prompt)
    {
        abort_if($prompt->user_id !== $request->user()->id, 403);

        $prompt->delete();

        return back();
    }
}
```

- [ ] **Passo 4: Rodar testes e confirmar que passam**

```bash
cd src/
sg docker -c "docker compose run --rm app php artisan test tests/Feature/Journal/JournalPromptTest.php --no-coverage"
```

Esperado: 5 testes passando.

- [ ] **Passo 5: Rodar suite completa para garantir zero regressões**

```bash
cd src/
sg docker -c "docker compose run --rm app php artisan test --no-coverage"
```

Esperado: todos os testes anteriores continuam passando + 10 novos.

- [ ] **Passo 6: Commit**

```bash
cd src/
git add app/Domains/Journal/Controllers/JournalPromptController.php \
        tests/Feature/Journal/JournalPromptTest.php
git commit -m "feat: add JournalPromptController with CRUD and feature tests"
```

---

## Task 6: Tipos TypeScript + DashboardAggregator

**Files:**
- Modify: `src/resources/js/types/index.d.ts`
- Modify: `src/app/Domains/Dashboard/Services/DashboardAggregator.php`
- Modify: `src/resources/js/Pages/Dashboard/Index.tsx`
- Modify: `src/resources/js/Pages/Dashboard/widgets/QuickStats.tsx`

- [ ] **Passo 1: Adicionar tipos em `types/index.d.ts`**

Adicionar ao final do arquivo `src/resources/js/types/index.d.ts`:

```typescript
export interface JournalEntry {
    id: number
    date: string
    content: string
    tags: string[]
    health_metric_id: number | null
    mood: number | null
    energy: number | null
    preview: string | null
}

export interface JournalPrompt {
    id: number
    content: string
    is_active: boolean
    position: number
}
```

- [ ] **Passo 2: Atualizar `DashboardAggregator.php`**

Substituir o conteúdo completo de `src/app/Domains/Dashboard/Services/DashboardAggregator.php`:

```php
<?php

namespace App\Domains\Dashboard\Services;

use App\Domains\Auth\Models\User;
use Carbon\Carbon;

class DashboardAggregator
{
    public function getStats(User $user): array
    {
        $now   = Carbon::now($user->timezone);
        $today = $now->toDateString();

        $activeHabits = $user->habits()->active()->with('checkIns')->get();

        $expectedToday = $activeHabits->filter(
            fn($h) => $h->isExpectedOn($now, $user->timezone)
        );

        $doneToday = $expectedToday->filter(
            fn($h) => $h->checkIns->contains(fn($ci) => $ci->date->toDateString() === $today)
        );

        $journalThisMonth = $user->journalEntries()
            ->whereMonth('date', $now->month)
            ->whereYear('date', $now->year)
            ->count();

        return [
            'tasks_due_today'          => 0,
            'habits_done_today'        => $doneToday->count(),
            'habits_total'             => $expectedToday->count(),
            'journal_entries_this_month' => $journalThisMonth,
            'open_projects'            => 0,
        ];
    }

    public function getHabitsToday(User $user): array
    {
        $now   = Carbon::now($user->timezone);
        $today = $now->toDateString();

        return $user->habits()
            ->active()
            ->with(['checkIns' => fn($q) => $q->whereDate('date', $today)])
            ->get()
            ->filter(fn($h) => $h->isExpectedOn($now, $user->timezone))
            ->map(fn($h) => [
                'id'               => $h->id,
                'name'             => $h->name,
                'icon'             => $h->icon,
                'checked_in_today' => $h->checkIns->isNotEmpty(),
            ])
            ->values()
            ->toArray();
    }

    public function getRecentActivity(User $user): array
    {
        return $user->auditLogs()
            ->latest('created_at')
            ->limit(5)
            ->get(['event', 'created_at'])
            ->toArray();
    }
}
```

- [ ] **Passo 3: Atualizar `Dashboard/Index.tsx`**

Substituir o conteúdo completo de `src/resources/js/Pages/Dashboard/Index.tsx`:

```tsx
// src/resources/js/Pages/Dashboard/Index.tsx
import AppLayout from '@/Layouts/AppLayout'
import QuickStats from './widgets/QuickStats'
import RecentActivity from './widgets/RecentActivity'
import TodayHabits from './widgets/TodayHabits'

interface HabitSummary {
    id: number
    name: string
    icon: string | null
    checked_in_today: boolean
}

interface Props {
    stats: {
        tasks_due_today: number
        habits_done_today: number
        habits_total: number
        journal_entries_this_month: number
        open_projects: number
    }
    recent_activity: Array<{ event: string; created_at: string }>
    habits_today: HabitSummary[]
}

export default function Dashboard({ stats, recent_activity, habits_today }: Props) {
    return (
        <AppLayout title="Dashboard">
            <div className="space-y-6 max-w-6xl">
                <QuickStats stats={stats} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <RecentActivity activities={recent_activity} />
                    <TodayHabits
                        habits_today={habits_today}
                        done={stats.habits_done_today}
                        total={stats.habits_total}
                    />
                </div>
            </div>
        </AppLayout>
    )
}
```

- [ ] **Passo 4: Atualizar `QuickStats.tsx`**

Substituir o conteúdo completo de `src/resources/js/Pages/Dashboard/widgets/QuickStats.tsx`:

```tsx
// src/resources/js/Pages/Dashboard/widgets/QuickStats.tsx
import Card from '@/Components/ui/Card'

interface Stats {
    tasks_due_today: number
    habits_done_today: number
    habits_total: number
    journal_entries_this_month: number
    open_projects: number
}

export default function QuickStats({ stats }: { stats: Stats }) {
    const items = [
        { label: 'Tarefas hoje',    value: stats.tasks_due_today,   unit: '' },
        { label: 'Hábitos',         value: `${stats.habits_done_today}/${stats.habits_total}`, unit: '' },
        { label: 'Diário (mês)',    value: stats.journal_entries_this_month, unit: 'entradas' },
        { label: 'Projetos ativos', value: stats.open_projects,     unit: '' },
    ]

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {items.map(item => (
                <Card key={item.label} className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500">{item.label}</span>
                    <span className="text-2xl font-bold text-slate-100">
                        {item.value}
                        {item.unit && <span className="text-sm text-slate-500 ml-1">{item.unit}</span>}
                    </span>
                </Card>
            ))}
        </div>
    )
}
```

- [ ] **Passo 5: Commit**

```bash
cd src/
git add resources/js/types/index.d.ts \
        app/Domains/Dashboard/Services/DashboardAggregator.php \
        resources/js/Pages/Dashboard/Index.tsx \
        resources/js/Pages/Dashboard/widgets/QuickStats.tsx
git commit -m "feat: add JournalEntry/JournalPrompt types and journal_entries_this_month in dashboard"
```

---

## Task 7: JournalCalendar.tsx

**Files:**
- Create: `src/resources/js/Pages/Journal/components/JournalCalendar.tsx`

- [ ] **Passo 1: Criar `JournalCalendar.tsx`**

```tsx
// src/resources/js/Pages/Journal/components/JournalCalendar.tsx
import { useState } from 'react'
import { JournalEntry } from '@/types'

interface Props {
    entries: JournalEntry[]
    today: string
    selectedDate: string | null
    onSelectDate: (date: string) => void
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function toDateString(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function JournalCalendar({ entries, today, selectedDate, onSelectDate }: Props) {
    const todayDate = new Date(today + 'T12:00:00')
    const [currentYear, setCurrentYear] = useState(todayDate.getFullYear())
    const [currentMonth, setCurrentMonth] = useState(todayDate.getMonth()) // 0-based

    const entryDates = new Set(entries.map(e => e.date))

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay() // 0=dom
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

    const prevMonth = () => {
        if (currentMonth === 0) { setCurrentYear(y => y - 1); setCurrentMonth(11) }
        else setCurrentMonth(m => m - 1)
    }

    const nextMonth = () => {
        if (currentMonth === 11) { setCurrentYear(y => y + 1); setCurrentMonth(0) }
        else setCurrentMonth(m => m + 1)
    }

    const isToday = (day: number) => toDateString(currentYear, currentMonth, day) === today
    const isSelected = (day: number) => toDateString(currentYear, currentMonth, day) === selectedDate
    const hasEntry = (day: number) => entryDates.has(toDateString(currentYear, currentMonth, day))

    const isFuture = (day: number) => toDateString(currentYear, currentMonth, day) > today

    // Células do calendário: blanks iniciais + dias do mês
    const cells: (number | null)[] = [
        ...Array(firstDayOfMonth).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            {/* Header do mês */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={prevMonth}
                    className="text-slate-500 hover:text-slate-300 px-2 py-1 rounded"
                >
                    ‹
                </button>
                <span className="text-sm font-medium text-slate-300">
                    {MONTH_NAMES[currentMonth]} {currentYear}
                </span>
                <button
                    onClick={nextMonth}
                    disabled={currentYear === todayDate.getFullYear() && currentMonth >= todayDate.getMonth()}
                    className="text-slate-500 hover:text-slate-300 px-2 py-1 rounded disabled:opacity-30"
                >
                    ›
                </button>
            </div>

            {/* Labels dias da semana */}
            <div className="grid grid-cols-7 mb-2">
                {WEEKDAY_LABELS.map(d => (
                    <div key={d} className="text-center text-xs text-slate-600 pb-1">{d}</div>
                ))}
            </div>

            {/* Células */}
            <div className="grid grid-cols-7 gap-y-1">
                {cells.map((day, idx) => {
                    if (!day) return <div key={`blank-${idx}`} />

                    const dateStr = toDateString(currentYear, currentMonth, day)
                    const future = isFuture(day)

                    return (
                        <button
                            key={day}
                            onClick={() => !future && onSelectDate(dateStr)}
                            disabled={future}
                            className={`
                                relative flex flex-col items-center py-1 rounded-lg text-xs transition-colors
                                ${future ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                                ${isSelected(day) ? 'bg-indigo-600 text-white' : ''}
                                ${isToday(day) && !isSelected(day) ? 'ring-1 ring-indigo-500 text-indigo-400' : ''}
                                ${!isSelected(day) && !isToday(day) && !future ? 'text-slate-400 hover:bg-slate-800' : ''}
                            `}
                        >
                            {day}
                            {hasEntry(day) && (
                                <span className={`w-1 h-1 rounded-full mt-0.5 ${
                                    isSelected(day) ? 'bg-white/60' : 'bg-indigo-500'
                                }`} />
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
```

- [ ] **Passo 2: Commit**

```bash
cd src/
git add resources/js/Pages/Journal/components/JournalCalendar.tsx
git commit -m "feat: add JournalCalendar component without external libs"
```

---

## Task 8: EntryList.tsx

**Files:**
- Create: `src/resources/js/Pages/Journal/components/EntryList.tsx`

- [ ] **Passo 1: Criar `EntryList.tsx`**

```tsx
// src/resources/js/Pages/Journal/components/EntryList.tsx
import { JournalEntry } from '@/types'

interface Props {
    entries: JournalEntry[]
    selectedDate: string | null
    onSelectDate: (date: string) => void
}

function formatDate(dateStr: string): string {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    })
}

const MOOD_EMOJI: Record<number, string> = { 1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😊' }

export default function EntryList({ entries, selectedDate, onSelectDate }: Props) {
    if (entries.length === 0) {
        return (
            <p className="text-center py-8 text-sm text-slate-600">
                Nenhuma entrada ainda. Comece escrevendo hoje.
            </p>
        )
    }

    return (
        <ul className="space-y-2">
            {entries.map(entry => (
                <li key={entry.id}>
                    <button
                        onClick={() => onSelectDate(entry.date)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                            selectedDate === entry.date
                                ? 'bg-slate-800 border-indigo-500/40'
                                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-slate-400 capitalize">
                                {formatDate(entry.date)}
                            </span>
                            {entry.mood && (
                                <span className="text-sm" title={`Humor: ${entry.mood}`}>
                                    {MOOD_EMOJI[entry.mood]}
                                </span>
                            )}
                        </div>

                        {entry.preview ? (
                            <p className="text-sm text-slate-500 line-clamp-2">{entry.preview}</p>
                        ) : (
                            <p className="text-sm text-slate-700 italic">Entrada vazia</p>
                        )}

                        {entry.tags.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                                {entry.tags.map(tag => (
                                    <span
                                        key={tag}
                                        className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-500"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </button>
                </li>
            ))}
        </ul>
    )
}
```

- [ ] **Passo 2: Commit**

```bash
cd src/
git add resources/js/Pages/Journal/components/EntryList.tsx
git commit -m "feat: add EntryList component"
```

---

## Task 9: EntryEditor.tsx (Tiptap + auto-save)

**Files:**
- Create: `src/resources/js/Pages/Journal/components/EntryEditor.tsx`

- [ ] **Passo 1: Criar `EntryEditor.tsx`**

```tsx
// src/resources/js/Pages/Journal/components/EntryEditor.tsx
import { useEffect, useRef, useState } from 'react'
import { router } from '@inertiajs/react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Heading from '@tiptap/extension-heading'
import { JournalEntry } from '@/types'

interface Props {
    entry: JournalEntry | null      // null = ainda não existe no banco
    selectedDate: string
    onBack: () => void
}

type SaveStatus = 'idle' | 'saving' | 'saved'

const MOOD_EMOJI: Record<number, string> = { 1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😊' }
const ENERGY_EMOJI: Record<number, string> = { 1: '🪫', 2: '😴', 3: '⚡', 4: '🔋', 5: '🚀' }

export default function EntryEditor({ entry, selectedDate, onBack }: Props) {
    const [status, setStatus] = useState<SaveStatus>('idle')
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: false }),
            Heading.configure({ levels: [2, 3] }),
        ],
        content: entry?.content ?? '',
        editorProps: {
            attributes: {
                class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[200px] px-1',
            },
        },
        onUpdate: ({ editor }) => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
            debounceRef.current = setTimeout(() => {
                save(editor.getHTML())
            }, 800)
        },
    })

    // Quando muda de data, atualiza conteúdo do editor
    useEffect(() => {
        if (!editor) return
        const newContent = entry?.content ?? ''
        if (editor.getHTML() !== newContent) {
            editor.commands.setContent(newContent, false)
        }
    }, [entry?.id, selectedDate])

    // Cleanup debounce no unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [])

    const save = (content: string) => {
        setStatus('saving')

        if (entry?.id) {
            router.patch(`/journal/${entry.id}`, { content }, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setStatus('saved'),
                onError: () => setStatus('idle'),
            })
        } else {
            router.post('/journal', { date: selectedDate, content }, {
                preserveScroll: true,
                onSuccess: () => setStatus('saved'),
                onError: () => setStatus('idle'),
            })
        }
    }

    const hasMoodOrEnergy = (entry?.mood ?? null) !== null || (entry?.energy ?? null) !== null

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="text-sm text-slate-500 hover:text-slate-300 flex items-center gap-1"
                >
                    ← Voltar
                </button>
                <span className="text-xs text-slate-600">
                    {status === 'saving' && 'Salvando…'}
                    {status === 'saved' && 'Salvo'}
                </span>
            </div>

            {/* Banner de métricas */}
            {hasMoodOrEnergy && (
                <div className="flex gap-3 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400">
                    {entry?.mood && (
                        <span>Humor: {MOOD_EMOJI[entry.mood]}</span>
                    )}
                    {entry?.energy && (
                        <span>Energia: {ENERGY_EMOJI[entry.energy]} registrados neste dia</span>
                    )}
                </div>
            )}

            {/* Toolbar Tiptap */}
            {editor && (
                <div className="flex items-center gap-1 flex-wrap border border-slate-800 rounded-lg px-2 py-1.5 bg-slate-900">
                    {[
                        { label: 'B',   action: () => editor.chain().focus().toggleBold().run(),         active: editor.isActive('bold') },
                        { label: 'I',   action: () => editor.chain().focus().toggleItalic().run(),       active: editor.isActive('italic') },
                        { label: 'H2',  action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }) },
                        { label: 'H3',  action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }) },
                        { label: '• Lista', action: () => editor.chain().focus().toggleBulletList().run(),  active: editor.isActive('bulletList') },
                        { label: '1. Lista', action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList') },
                    ].map(({ label, action, active }) => (
                        <button
                            key={label}
                            onClick={action}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                active
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {/* Editor */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <EditorContent editor={editor} />
            </div>
        </div>
    )
}
```

- [ ] **Passo 2: Commit**

```bash
cd src/
git add resources/js/Pages/Journal/components/EntryEditor.tsx
git commit -m "feat: add EntryEditor with Tiptap and 800ms debounce auto-save"
```

---

## Task 10: PromptsPanel.tsx + PromptManager.tsx

**Files:**
- Create: `src/resources/js/Pages/Journal/components/PromptsPanel.tsx`
- Create: `src/resources/js/Pages/Journal/components/PromptManager.tsx`

- [ ] **Passo 1: Criar `PromptManager.tsx`**

```tsx
// src/resources/js/Pages/Journal/components/PromptManager.tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'
import { JournalPrompt } from '@/types'

interface Props {
    prompts: JournalPrompt[]
    onClose: () => void
}

export default function PromptManager({ prompts, onClose }: Props) {
    const [newContent, setNewContent] = useState('')

    const addPrompt = () => {
        if (!newContent.trim()) return
        router.post('/journal/prompts', { content: newContent }, {
            preserveScroll: true,
            onSuccess: () => setNewContent(''),
        })
    }

    const updateContent = (prompt: JournalPrompt, content: string) => {
        router.patch(`/journal/prompts/${prompt.id}`, { content }, {
            preserveScroll: true,
        })
    }

    const moveUp = (prompt: JournalPrompt, index: number) => {
        if (index === 0) return
        router.patch(`/journal/prompts/${prompt.id}`, { position: prompt.position - 1 }, {
            preserveScroll: true,
        })
    }

    const moveDown = (prompt: JournalPrompt, index: number) => {
        if (index === prompts.length - 1) return
        router.patch(`/journal/prompts/${prompt.id}`, { position: prompt.position + 1 }, {
            preserveScroll: true,
        })
    }

    const deletePrompt = (prompt: JournalPrompt) => {
        router.delete(`/journal/prompts/${prompt.id}`, {
            preserveScroll: true,
        })
    }

    return (
        <>
            {/* Overlay */}
            <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

            {/* Modal */}
            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-96 bg-slate-900 border border-slate-800 rounded-xl z-50 shadow-xl">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                    <h2 className="text-sm font-semibold text-slate-200">Gerenciar Prompts</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg">×</button>
                </div>

                <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                    {prompts.length === 0 && (
                        <p className="text-sm text-slate-600 text-center py-4">
                            Nenhum prompt. Crie o primeiro abaixo.
                        </p>
                    )}

                    {prompts.map((prompt, index) => (
                        <div key={prompt.id} className="flex items-start gap-2 group">
                            <div className="flex flex-col gap-0.5">
                                <button
                                    onClick={() => moveUp(prompt, index)}
                                    disabled={index === 0}
                                    className="text-slate-600 hover:text-slate-400 disabled:opacity-20 text-xs px-1"
                                >
                                    ↑
                                </button>
                                <button
                                    onClick={() => moveDown(prompt, index)}
                                    disabled={index === prompts.length - 1}
                                    className="text-slate-600 hover:text-slate-400 disabled:opacity-20 text-xs px-1"
                                >
                                    ↓
                                </button>
                            </div>

                            <input
                                type="text"
                                defaultValue={prompt.content}
                                onBlur={e => {
                                    if (e.target.value !== prompt.content) {
                                        updateContent(prompt, e.target.value)
                                    }
                                }}
                                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />

                            <button
                                onClick={() => deletePrompt(prompt)}
                                className="text-slate-600 hover:text-red-400 transition-colors text-sm px-1 pt-1.5"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-slate-800 flex gap-2">
                    <input
                        type="text"
                        value={newContent}
                        onChange={e => setNewContent(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addPrompt()}
                        placeholder="Novo prompt..."
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                        onClick={addPrompt}
                        disabled={!newContent.trim()}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-indigo-500 transition-colors"
                    >
                        +
                    </button>
                </div>
            </div>
        </>
    )
}
```

- [ ] **Passo 2: Criar `PromptsPanel.tsx`**

```tsx
// src/resources/js/Pages/Journal/components/PromptsPanel.tsx
import { useState } from 'react'
import { JournalPrompt } from '@/types'
import PromptManager from './PromptManager'

interface Props {
    prompts: JournalPrompt[]
}

export default function PromptsPanel({ prompts }: Props) {
    const [open, setOpen] = useState(prompts.length > 0)
    const [managerOpen, setManagerOpen] = useState(false)

    if (prompts.length === 0 && !managerOpen) {
        return (
            <div className="flex justify-end">
                <button
                    onClick={() => setManagerOpen(true)}
                    className="text-xs text-slate-600 hover:text-slate-400 flex items-center gap-1"
                >
                    ⚙ Adicionar prompts
                </button>
                {managerOpen && (
                    <PromptManager prompts={prompts} onClose={() => setManagerOpen(false)} />
                )}
            </div>
        )
    }

    return (
        <>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl">
                <button
                    onClick={() => setOpen(o => !o)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Prompts de escrita
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={e => { e.stopPropagation(); setManagerOpen(true) }}
                            className="text-slate-600 hover:text-slate-400 text-xs"
                        >
                            ⚙
                        </button>
                        <span className="text-slate-600 text-xs">{open ? '▲' : '▼'}</span>
                    </div>
                </button>

                {open && (
                    <div className="px-4 pb-4 space-y-2 border-t border-slate-800 pt-3">
                        {prompts.map(prompt => (
                            <div
                                key={prompt.id}
                                className="text-sm text-slate-400 px-3 py-2 bg-slate-800/50 rounded-lg"
                            >
                                {prompt.content}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {managerOpen && (
                <PromptManager prompts={prompts} onClose={() => setManagerOpen(false)} />
            )}
        </>
    )
}
```

- [ ] **Passo 3: Commit**

```bash
cd src/
git add resources/js/Pages/Journal/components/PromptsPanel.tsx \
        resources/js/Pages/Journal/components/PromptManager.tsx
git commit -m "feat: add PromptsPanel and PromptManager components"
```

---

## Task 11: Journal/Index.tsx (página completa)

**Files:**
- Modify: `src/resources/js/Pages/Journal/Index.tsx` (substituir stub)

- [ ] **Passo 1: Substituir stub pelo `Index.tsx` completo**

```tsx
// src/resources/js/Pages/Journal/Index.tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { JournalEntry, JournalPrompt } from '@/types'
import JournalCalendar from './components/JournalCalendar'
import EntryList from './components/EntryList'
import EntryEditor from './components/EntryEditor'
import PromptsPanel from './components/PromptsPanel'
import Button from '@/Components/ui/Button'

interface Props {
    entries: JournalEntry[]
    prompts: JournalPrompt[]
    today: string
}

export default function JournalIndex({ entries, prompts, today }: Props) {
    const [selectedDate, setSelectedDate] = useState<string | null>(null)

    const currentEntry = selectedDate
        ? entries.find(e => e.date === selectedDate) ?? null
        : null

    const handleBack = () => setSelectedDate(null)

    return (
        <AppLayout title="Diário">
            <div className="max-w-2xl space-y-4">
                {selectedDate ? (
                    <>
                        <PromptsPanel prompts={prompts} />
                        <EntryEditor
                            entry={currentEntry}
                            selectedDate={selectedDate}
                            onBack={handleBack}
                        />
                    </>
                ) : (
                    <>
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                                Diário Pessoal
                            </h2>
                            <Button size="sm" onClick={() => setSelectedDate(today)}>
                                Escrever hoje
                            </Button>
                        </div>

                        <JournalCalendar
                            entries={entries}
                            today={today}
                            selectedDate={selectedDate}
                            onSelectDate={setSelectedDate}
                        />

                        <EntryList
                            entries={entries}
                            selectedDate={selectedDate}
                            onSelectDate={setSelectedDate}
                        />
                    </>
                )}
            </div>
        </AppLayout>
    )
}
```

- [ ] **Passo 2: Commit**

```bash
cd src/
git add resources/js/Pages/Journal/Index.tsx
git commit -m "feat: implement Journal/Index page with calendar, list and editor"
```

---

## Task 12: Verificação Final

- [ ] **Passo 1: Rodar suite completa de testes**

```bash
cd src/
sg docker -c "docker compose run --rm app php artisan test --no-coverage"
```

Esperado: todos os testes passando (0 falhas).

- [ ] **Passo 2: Build TypeScript sem erros**

```bash
cd src/
sg docker -c "docker compose run --rm node npm run build"
```

Esperado: build sem erros TypeScript.

- [ ] **Passo 3: Verificação visual — lista e calendário**

Acessar `https://vaultus.local/journal` e confirmar:
- [ ] Calendário exibe o mês atual com botões de navegação
- [ ] Dias com entrada têm ponto indigo abaixo do número
- [ ] Clicar num dia: abre editor
- [ ] Botão "Escrever hoje": abre editor para hoje
- [ ] Lista vazia mostra mensagem "Nenhuma entrada ainda"

- [ ] **Passo 4: Verificação visual — editor e auto-save**

- [ ] Digitar texto → indicador "Salvando…" após 800ms → "Salvo"
- [ ] Primeira gravação: `POST /journal` — entrada aparece na lista ao voltar
- [ ] Segunda gravação: `PATCH /journal/{id}` — sem criar duplicata
- [ ] Toolbar: Bold, Italic, H2, H3, Bullet list, Ordered list funcionam
- [ ] Botão "← Voltar" retorna para calendário+lista

- [ ] **Passo 5: Verificação visual — prompts**

- [ ] Sem prompts: botão "⚙ Adicionar prompts" visível
- [ ] Criar prompt no modal: aparece no painel
- [ ] Reordenar com ↑↓: ordem muda
- [ ] Deletar prompt: some da lista

- [ ] **Passo 6: Verificação visual — dashboard**

Acessar `https://vaultus.local/dashboard` e confirmar:
- [ ] Card "Diário (mês)" exibe contagem correta (não `journal_streak`)

- [ ] **Passo 7: Commit final (se houver arquivos não commitados)**

```bash
cd src/
git status
# Adicionar apenas arquivos que ainda não foram commitados acima
git commit -m "feat: complete Phase 3 - journal module with Tiptap editor"
```

---

## Checklist de Conclusão da Fase 3

- [ ] Tiptap instalado (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-heading`)
- [ ] Models `JournalEntry` (com `EncryptedCast` em `content`) e `JournalPrompt` com factories
- [ ] `User` model com `journalEntries()` e `journalPrompts()`
- [ ] `JournalEntryController` com `index`, `store`, `update`
- [ ] `JournalPromptController` com `store`, `update`, `destroy`
- [ ] Rotas: `/journal/prompts` definidas ANTES de `/journal/{entry}` em `web.php`
- [ ] `journal` removido do `$stubs` em `web.php`
- [ ] `JournalEntryResource` com `preview`, `mood`, `energy`
- [ ] `JournalPromptResource` simples
- [ ] Feature tests: 5 para entradas + 5 para prompts (todos passando)
- [ ] Tipos TypeScript: `JournalEntry`, `JournalPrompt` em `index.d.ts`
- [ ] `DashboardAggregator` com `journal_entries_this_month` (sem `journal_streak`)
- [ ] `QuickStats` exibindo "Diário (mês)" com contagem
- [ ] Frontend: `JournalCalendar`, `EntryList`, `EntryEditor`, `PromptsPanel`, `PromptManager`, `Journal/Index`
- [ ] Auto-save: 800ms debounce, POST na criação, PATCH na atualização
- [ ] `EncryptedCast` aplicado ao campo `content` (diário é conteúdo sensível)
- [ ] Build TypeScript sem erros
- [ ] Suite de testes: 0 falhas
