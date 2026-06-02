# Biblioteca — Edição de itens & status "abandonado" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir editar e excluir qualquer item da Biblioteca pelo mesmo modal de criação (modo edição), em todos os status, e introduzir o status `abandoned`.

**Architecture:** Backend ganha `update`/`destroy` no `LibraryController` (route-model binding + checagem de posse, espelhando `HabitController`); `validatedData()` passa a aceitar `abandoned`, validar `current_page ≤ total_pages` e preencher `finished_at` ao concluir. O `index` envia, em cada item, os campos editáveis (datas em ISO) para o modal pré-preencher. No front, `LibraryModal` vira create+edit (`isEdit ? patch : post`) com botão Excluir, e `Library/Index.tsx` torna cada livro clicável e adiciona a seção "Abandonados".

**Tech Stack:** Laravel 11 (PHPUnit), Inertia.js + React + TypeScript, Vite. Comandos rodam em containers Docker.

**Comandos de verificação:**
- Testes backend: `docker compose exec -T app php artisan test --filter=LibraryTest`
- Build/typecheck front: `docker compose --profile dev run --rm node sh -c "npm run build"`

**Referência de design:** `docs/superpowers/specs/2026-06-01-biblioteca-edicao-design.md`

**Convenção de commit do repo:** `feat(library): …` / `test(library): …`. **Sem `Co-Authored-By`** (preferência do usuário).

---

## File Structure

- `src/app/Domains/Library/Controllers/LibraryController.php` — Modify: validação, `update`, `destroy`, `index` enriquecido, helper `bookPayload`.
- `src/routes/web.php` — Modify: 2 rotas (`PATCH`/`DELETE`).
- `src/resources/js/Pages/Library/components/LibraryModal.tsx` — Replace: create+edit, excluir, erros, status `abandoned`.
- `src/resources/js/Pages/Library/Index.tsx` — Replace: clique p/ editar, estado tri-state, seção abandonados, labels de data.
- `src/tests/Feature/Library/LibraryTest.php` — Modify: novos testes de feature.

---

## Task 1: Validação — `abandoned`, `current_page ≤ total_pages`, `finished_at` automático

**Files:**
- Modify: `src/app/Domains/Library/Controllers/LibraryController.php`
- Test: `src/tests/Feature/Library/LibraryTest.php`

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao final da classe em `src/tests/Feature/Library/LibraryTest.php` (antes do `}` final):

```php
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
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `docker compose exec -T app php artisan test --filter=LibraryTest`
Expected: FAIL — `abandoned` rejeitado pelo `in:`; `current_page>total` cria mesmo assim; `finished_at` fica `null`.

- [ ] **Step 3: Atualizar `validatedData` e o import**

Em `src/app/Domains/Library/Controllers/LibraryController.php`, adicionar o import logo após `use Illuminate\Routing\Controller;`:

```php
use Illuminate\Validation\ValidationException;
```

Substituir o método `validatedData` inteiro por:

```php
    private function validatedData(Request $request): array
    {
        $validated = $request->validate([
            'title'        => 'required|string|max:255',
            'author'       => 'nullable|string|max:255',
            'status'       => 'required|string|in:reading,done,queue,abandoned',
            'genre'        => 'nullable|string|max:100',
            'cover_url'    => 'nullable|url|max:1024',
            'total_pages'  => 'nullable|integer|min:1|max:100000',
            'current_page' => 'nullable|integer|min:0|max:100000',
            'rating'       => 'nullable|integer|min:1|max:5',
            'started_at'   => 'nullable|date',
            'finished_at'  => 'nullable|date',
        ]);

        if (isset($validated['current_page'], $validated['total_pages'])
            && $validated['current_page'] > $validated['total_pages']) {
            throw ValidationException::withMessages([
                'current_page' => 'A página atual não pode exceder o total de páginas.',
            ]);
        }

        if (($validated['status'] ?? null) === 'done' && empty($validated['finished_at'])) {
            $validated['finished_at'] = now()->toDateString();
        }

        return $validated;
    }
```

- [ ] **Step 4: Rodar e confirmar que passam**

Run: `docker compose exec -T app php artisan test --filter=LibraryTest`
Expected: PASS (todos, incluindo os 3 originais).

- [ ] **Step 5: Commit**

```bash
git add src/app/Domains/Library/Controllers/LibraryController.php src/tests/Feature/Library/LibraryTest.php
git commit -m "feat(library): validação de página, finished_at automático e status abandoned"
```

---

## Task 2: Endpoint `update`

**Files:**
- Modify: `src/app/Domains/Library/Controllers/LibraryController.php`
- Modify: `src/routes/web.php:141`
- Test: `src/tests/Feature/Library/LibraryTest.php`

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar à classe de teste:

```php
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
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `docker compose exec -T app php artisan test --filter=LibraryTest`
Expected: FAIL — rota `PATCH /library/{id}` não existe (404/405).

- [ ] **Step 3: Adicionar a rota**

Em `src/routes/web.php`, logo após a linha `Route::post('/library', [LibraryController::class, 'store']);`:

```php
    Route::patch('/library/{libraryItem}', [LibraryController::class, 'update']);
```

- [ ] **Step 4: Adicionar o método `update`**

Em `LibraryController`, logo após o método `store` (antes de `validatedData`):

```php
    public function update(Request $request, LibraryItem $libraryItem): RedirectResponse
    {
        abort_if($libraryItem->user_id !== $request->user()->id, 403);

        $libraryItem->update($this->validatedData($request));

        return redirect()->route('library')->with('success', 'Livro atualizado.');
    }
```

- [ ] **Step 5: Rodar e confirmar que passam**

Run: `docker compose exec -T app php artisan test --filter=LibraryTest`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/Domains/Library/Controllers/LibraryController.php src/routes/web.php src/tests/Feature/Library/LibraryTest.php
git commit -m "feat(library): endpoint de edição (PATCH) com checagem de posse"
```

---

## Task 3: Endpoint `destroy`

**Files:**
- Modify: `src/app/Domains/Library/Controllers/LibraryController.php`
- Modify: `src/routes/web.php` (após a rota `PATCH` da Task 2)
- Test: `src/tests/Feature/Library/LibraryTest.php`

- [ ] **Step 1: Escrever os testes que falham**

```php
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
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `docker compose exec -T app php artisan test --filter=LibraryTest`
Expected: FAIL — rota `DELETE /library/{id}` não existe.

- [ ] **Step 3: Adicionar a rota**

Em `src/routes/web.php`, logo após a rota `PATCH` da Task 2:

```php
    Route::delete('/library/{libraryItem}', [LibraryController::class, 'destroy']);
```

- [ ] **Step 4: Adicionar o método `destroy`**

Em `LibraryController`, logo após `update`:

```php
    public function destroy(Request $request, LibraryItem $libraryItem): RedirectResponse
    {
        abort_if($libraryItem->user_id !== $request->user()->id, 403);

        $libraryItem->delete();

        return redirect()->route('library')->with('success', 'Livro removido.');
    }
```

- [ ] **Step 5: Rodar e confirmar que passam**

Run: `docker compose exec -T app php artisan test --filter=LibraryTest`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/Domains/Library/Controllers/LibraryController.php src/routes/web.php src/tests/Feature/Library/LibraryTest.php
git commit -m "feat(library): endpoint de exclusão (DELETE) com soft-delete"
```

---

## Task 4: `index` enriquecido + lista `abandoned`

**Files:**
- Modify: `src/app/Domains/Library/Controllers/LibraryController.php`
- Test: `src/tests/Feature/Library/LibraryTest.php`

- [ ] **Step 1: Escrever o teste que falha**

```php
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
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `docker compose exec -T app php artisan test --filter=LibraryTest`
Expected: FAIL — prop `abandoned` não existe; `reading.0.status` ausente.

- [ ] **Step 3: Substituir o método `index` e adicionar `bookPayload`**

Em `LibraryController`, substituir o método `index` inteiro por:

```php
    public function index(Request $request)
    {
        $user = $request->user();

        $reading = LibraryItem::where('user_id', $user->id)
            ->where('type', 'book')
            ->where('status', 'reading')
            ->orderBy('started_at', 'desc')
            ->get()
            ->map(fn($b) => array_merge($this->bookPayload($b), [
                'started_label' => $b->started_at?->format('M Y'),
            ]))
            ->values()
            ->toArray();

        $doneRecent = LibraryItem::where('user_id', $user->id)
            ->where('type', 'book')
            ->where('status', 'done')
            ->orderBy('finished_at', 'desc')
            ->limit(8)
            ->get()
            ->map(fn($b) => array_merge($this->bookPayload($b), [
                'finished_label' => $b->finished_at?->format('M Y'),
            ]))
            ->values()
            ->toArray();

        $queue = LibraryItem::where('user_id', $user->id)
            ->where('type', 'book')
            ->where('status', 'queue')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(fn($b) => array_merge($this->bookPayload($b), [
                'added' => $b->created_at->format('M'),
            ]))
            ->values()
            ->toArray();

        $abandoned = LibraryItem::where('user_id', $user->id)
            ->where('type', 'book')
            ->where('status', 'abandoned')
            ->orderBy('updated_at', 'desc')
            ->limit(10)
            ->get()
            ->map(fn($b) => $this->bookPayload($b))
            ->values()
            ->toArray();

        $totalYear = LibraryItem::where('user_id', $user->id)
            ->where('type', 'book')
            ->where('status', 'done')
            ->whereYear('finished_at', now()->year)
            ->count();

        $pagesYear = LibraryItem::where('user_id', $user->id)
            ->where('type', 'book')
            ->whereNotNull('total_pages')
            ->where('status', 'done')
            ->whereYear('finished_at', now()->year)
            ->sum('total_pages');

        return Inertia::render('Library/Index', [
            'reading'     => $reading,
            'done_recent' => $doneRecent,
            'queue'       => $queue,
            'abandoned'   => $abandoned,
            'stats'       => [
                'total_year'  => $totalYear,
                'in_progress' => count($reading),
                'pages_year'  => (int) $pagesYear,
                'queue_count' => LibraryItem::where('user_id', $user->id)->where('type', 'book')->where('status', 'queue')->count(),
            ],
        ]);
    }

    private function bookPayload(LibraryItem $b): array
    {
        return [
            'id'               => $b->id,
            'title'            => $b->title,
            'author'           => $b->author,
            'status'           => $b->status,
            'genre'            => $b->genre,
            'cover_url'        => $b->cover_url,
            'total_pages'      => $b->total_pages,
            'current_page'     => $b->current_page ?? 0,
            'rating'           => $b->rating,
            'progress_percent' => $b->progress_percent,
            'started_at'       => $b->started_at?->format('Y-m-d'),
            'finished_at'      => $b->finished_at?->format('Y-m-d'),
        ];
    }
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `docker compose exec -T app php artisan test --filter=LibraryTest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/Domains/Library/Controllers/LibraryController.php src/tests/Feature/Library/LibraryTest.php
git commit -m "feat(library): index expõe campos editáveis e lista de abandonados"
```

---

## Task 5: `LibraryModal` vira create + edit

**Files:**
- Replace: `src/resources/js/Pages/Library/components/LibraryModal.tsx`

> Sem teste automatizado (não há harness JS); verificação via build/typecheck. Esta task deixa o app buildável; a abertura em modo edição é ligada na Task 6.

- [ ] **Step 1: Substituir o arquivo inteiro**

Conteúdo completo de `src/resources/js/Pages/Library/components/LibraryModal.tsx`:

```tsx
import { useState } from 'react'
import { router, usePage } from '@inertiajs/react'
import { Icons } from '@/Components/Icons'
import { useConfirm } from '@/Components/dialogs/DialogProvider'

type Status = 'reading' | 'done' | 'queue' | 'abandoned'

export interface EditableBook {
  id: number
  title: string
  author: string | null
  status: Status
  genre: string | null
  cover_url: string | null
  total_pages: number | null
  current_page: number | null
  rating: number | null
  started_at: string | null
  finished_at: string | null
}

interface Props {
  item?: EditableBook | null
  onClose: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', background: 'var(--surface-2)',
  border: '1px solid var(--line)', borderRadius: 6, color: 'var(--text)', fontSize: 13,
}

const errStyle: React.CSSProperties = { color: 'var(--rose)', fontSize: 11, marginTop: 4 }

export default function LibraryModal({ item, onClose }: Props) {
  const confirm = useConfirm()
  const errors = usePage().props.errors as Record<string, string> | undefined
  const isEdit = !!item

  const [title, setTitle] = useState(item?.title ?? '')
  const [author, setAuthor] = useState(item?.author ?? '')
  const [status, setStatus] = useState<Status>(item?.status ?? 'reading')
  const [genre, setGenre] = useState(item?.genre ?? '')
  const [coverUrl, setCoverUrl] = useState(item?.cover_url ?? '')
  const [totalPages, setTotalPages] = useState(item?.total_pages != null ? String(item.total_pages) : '')
  const [currentPage, setCurrentPage] = useState(item?.current_page != null ? String(item.current_page) : '')
  const [rating, setRating] = useState(item?.rating != null ? String(item.rating) : '')
  const [startedAt, setStartedAt] = useState(item?.started_at ?? '')
  const [finishedAt, setFinishedAt] = useState(item?.finished_at ?? '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      title,
      author: author || null,
      status,
      genre: genre || null,
      cover_url: coverUrl || null,
      total_pages: totalPages ? Number(totalPages) : null,
      current_page: currentPage ? Number(currentPage) : null,
      rating: status === 'done' && rating ? Number(rating) : null,
      started_at: status !== 'queue' ? (startedAt || null) : null,
      finished_at: status === 'done' ? (finishedAt || null) : null,
    }
    const opts = { preserveScroll: true, onSuccess: onClose }
    if (isEdit) router.patch(`/library/${item!.id}`, payload, opts)
    else router.post('/library', payload, opts)
  }

  async function handleDelete() {
    if (!item) return
    if (!(await confirm({ title: `Remover "${item.title}"?`, variant: 'danger', confirmText: 'Excluir' }))) return
    router.delete(`/library/${item.id}`, { preserveScroll: true, onSuccess: onClose })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', zIndex: 50 }} onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ width: 560, maxWidth: '90vw', maxHeight: '85vh', overflow: 'auto', padding: 28, display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="h-3">{isEdit ? 'Editar livro' : 'Adicionar livro'}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar"><Icons.X size={13} /></button>
        </div>

        <label>
          <div className="kicker" style={{ marginBottom: 4 }}>Título</div>
          <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
          {errors?.title && <div style={errStyle}>{errors.title}</div>}
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Autor</div>
            <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} style={inputStyle} />
          </label>
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Gênero</div>
            <input type="text" value={genre} onChange={(e) => setGenre(e.target.value)} style={inputStyle} />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Status</div>
            <select value={status} onChange={(e) => setStatus(e.target.value as Status)} style={inputStyle}>
              <option value="reading">Em leitura</option>
              <option value="queue">Na fila</option>
              <option value="done">Concluído</option>
              <option value="abandoned">Abandonado</option>
            </select>
          </label>
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Capa (URL)</div>
            <input type="url" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…" style={inputStyle} />
            {errors?.cover_url && <div style={errStyle}>{errors.cover_url}</div>}
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Total de páginas</div>
            <input type="number" min={1} value={totalPages} onChange={(e) => setTotalPages(e.target.value)} style={inputStyle} />
          </label>
          {(status === 'reading' || status === 'abandoned') && (
            <label>
              <div className="kicker" style={{ marginBottom: 4 }}>Página atual</div>
              <input type="number" min={0} value={currentPage} onChange={(e) => setCurrentPage(e.target.value)} style={inputStyle} />
              {errors?.current_page && <div style={errStyle}>{errors.current_page}</div>}
            </label>
          )}
        </div>

        {status !== 'queue' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label>
              <div className="kicker" style={{ marginBottom: 4 }}>Início</div>
              <input type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} style={inputStyle} />
            </label>
            {status === 'done' && (
              <label>
                <div className="kicker" style={{ marginBottom: 4 }}>Conclusão</div>
                <input type="date" value={finishedAt} onChange={(e) => setFinishedAt(e.target.value)} style={inputStyle} />
              </label>
            )}
          </div>
        )}

        {status === 'done' && (
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Avaliação (1–5)</div>
            <input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(e.target.value)} style={{ ...inputStyle, width: 120 }} />
          </label>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <div>
            {isEdit && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleDelete} style={{ color: 'var(--rose)' }}>Excluir</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm">{isEdit ? 'Salvar' : 'Adicionar'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Buildar/typecheck**

Run: `docker compose --profile dev run --rm node sh -c "npm run build"`
Expected: build conclui sem erros de TypeScript. (Index.tsx ainda usa o modal sem `item` — compatível, pois a prop é opcional.)

- [ ] **Step 3: Commit**

```bash
git add src/resources/js/Pages/Library/components/LibraryModal.tsx
git commit -m "feat(library): modal de criação vira create+edit com exclusão e status abandoned"
```

---

## Task 6: `Index.tsx` — clique para editar + seção "Abandonados"

**Files:**
- Replace: `src/resources/js/Pages/Library/Index.tsx`

- [ ] **Step 1: Substituir o arquivo inteiro**

Conteúdo completo de `src/resources/js/Pages/Library/Index.tsx`:

```tsx
import { useState } from 'react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import Sparkline from '@/Components/charts/Sparkline'
import LibraryModal, { EditableBook } from './components/LibraryModal'

interface BookReading extends EditableBook { started_label: string | null }
interface BookDone extends EditableBook { finished_label: string | null }
interface BookQueue extends EditableBook { added: string }
type BookAbandoned = EditableBook

interface Props {
    reading: BookReading[]
    done_recent: BookDone[]
    queue: BookQueue[]
    abandoned: BookAbandoned[]
    stats: { total_year: number; in_progress: number; pages_year: number; queue_count: number }
}

function Stars({ rating }: { rating: number | null }) {
    if (!rating) return null
    return (
        <div style={{ display: 'flex', gap: 1, color: 'var(--gold)' }}>
            {Array.from({ length: 5 }).map((_, i) => (
                <Icons.Star key={i} size={12} style={{ fill: i < rating ? 'currentColor' : 'transparent' }} />
            ))}
        </div>
    )
}

export default function LibraryIndex({ reading, done_recent, queue, abandoned, stats }: Props) {
    const [editing, setEditing] = useState<EditableBook | null | undefined>(undefined)

    return (
        <AppLayout
            title="Biblioteca"
            eyebrow="Acervo"
            subtitle={`${stats.total_year} livros · ${stats.in_progress} em curso · ${stats.queue_count} na fila.`}
            actions={
                <button className="btn btn-primary btn-sm" onClick={() => setEditing(null)}>
                    <Icons.Plus size={13} /> Adicionar livro
                </button>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Stats */}
                <div className="grid g-4">
                    {[
                        { label: 'Livros · 2026',  value: String(stats.total_year),                  sub: `meta 24 · ${Math.round(stats.total_year / 24 * 100)}%`, spark: [1,2,3,3,4,5,6,7,8,9,10,stats.total_year], accent: 'var(--green)' },
                        { label: 'Em curso',       value: String(stats.in_progress),                 sub: 'leituras ativas',                                       spark: [1,2,1,2,3,2,3,2,3,2,3,stats.in_progress], accent: 'var(--gold)' },
                        { label: 'Páginas no ano', value: stats.pages_year.toLocaleString('pt-BR'),  sub: 'páginas lidas',                                         spark: [200,400,600,800,1100,1400,1700,2000,2400,2800,3200,stats.pages_year], accent: 'var(--green)' },
                        { label: 'Na fila',        value: String(stats.queue_count),                 sub: 'prontos para ler',                                      spark: [5,6,7,6,8,7,9,8,7,8,9,stats.queue_count], accent: 'var(--sky)' },
                    ].map((s, i) => (
                        <div key={i} className="stat" style={{ padding: '18px 22px' }}>
                            <div className="stat-label">{s.label}</div>
                            <div className="stat-value" style={{ fontSize: 28 }}>{s.value}</div>
                            <div className="stat-delta flat" style={{ marginTop: 4 }}>{s.sub}</div>
                            <div className="stat-spark">
                                <Sparkline data={s.spark} accent={s.accent} area />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Em leitura */}
                <div>
                    <div className="kicker" style={{ marginBottom: 12 }}>Em leitura · {reading.length}</div>
                    {reading.length === 0 ? (
                        <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhum livro em leitura.</div>
                    ) : (
                        <div className="grid g-3">
                            {reading.map(b => (
                                <div key={b.id} className="card" style={{ padding: 20, cursor: 'pointer' }} onClick={() => setEditing(b)}>
                                    <div style={{ display: 'flex', gap: 18 }}>
                                        {b.cover_url ? (
                                            <img src={b.cover_url} alt={b.title} loading="lazy" style={{ width: 80, height: 120, objectFit: 'cover', borderRadius: 'var(--r-2)', flex: 'none' }} />
                                        ) : (
                                            <div className="ph" style={{ width: 80, height: 120, flex: 'none', fontSize: 0 }} />
                                        )}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h3 className="h-3" style={{ fontSize: 15 }}>{b.title}</h3>
                                            {b.author && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{b.author}</div>}
                                            {b.started_label && <div className="mono" style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 8 }}>iniciado · {b.started_label}</div>}
                                            {b.total_pages && (
                                                <div style={{ marginTop: 14 }}>
                                                    <div className="meter"><span style={{ width: `${b.progress_percent}%` }} /></div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-3)' }}>
                                                        <span className="mono">{b.current_page}/{b.total_pages} pg</span>
                                                        <span className="mono" style={{ color: 'var(--green)' }}>{b.progress_percent}%</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Concluídos + Fila */}
                <div className="grid g-12-5">
                    <div>
                        <div className="kicker" style={{ marginBottom: 12 }}>Concluídos · recentes</div>
                        <div className="card" style={{ padding: 0 }}>
                            {done_recent.length === 0 ? (
                                <div style={{ padding: '18px 20px', color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nenhum livro concluído ainda.</div>
                            ) : (
                                done_recent.map((b, i) => (
                                    <div key={b.id} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '14px 20px', borderTop: i ? '1px solid var(--line-soft)' : 'none', cursor: 'pointer' }} onClick={() => setEditing(b)}>
                                        {b.cover_url ? (
                                            <img src={b.cover_url} alt={b.title} loading="lazy" style={{ width: 32, height: 46, objectFit: 'cover', borderRadius: 'var(--r-2)', flex: 'none' }} />
                                        ) : (
                                            <div className="ph" style={{ width: 32, height: 46, flex: 'none', fontSize: 0 }} />
                                        )}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="h-3" style={{ fontSize: 14 }}>{b.title}</div>
                                            {b.author && <div className="muted" style={{ fontSize: 12 }}>{b.author}</div>}
                                        </div>
                                        <Stars rating={b.rating} />
                                        {b.finished_label && <div className="mono muted" style={{ fontSize: 11, minWidth: 60, textAlign: 'right' }}>{b.finished_label}</div>}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="kicker" style={{ marginBottom: 12 }}>Fila · {stats.queue_count}</div>
                        <div className="card" style={{ padding: 0 }}>
                            {queue.length === 0 ? (
                                <div style={{ padding: '18px 20px', color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Fila vazia.</div>
                            ) : (
                                queue.map((b, i) => (
                                    <div key={b.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 20px', borderTop: i ? '1px solid var(--line-soft)' : 'none', cursor: 'pointer' }} onClick={() => setEditing(b)}>
                                        <div className="mono muted-2" style={{ fontSize: 11, width: 24 }}>{(i + 1).toString().padStart(2, '0')}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13.5 }}>{b.title}</div>
                                            {b.author && <div className="muted" style={{ fontSize: 11.5 }}>{b.author}</div>}
                                        </div>
                                        <div className="mono muted" style={{ fontSize: 11 }}>{b.added}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Abandonados */}
                {abandoned.length > 0 && (
                    <div>
                        <div className="kicker" style={{ marginBottom: 12 }}>Abandonados · {abandoned.length}</div>
                        <div className="card" style={{ padding: 0 }}>
                            {abandoned.map((b, i) => (
                                <div key={b.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 20px', borderTop: i ? '1px solid var(--line-soft)' : 'none', cursor: 'pointer' }} onClick={() => setEditing(b)}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13.5 }}>{b.title}</div>
                                        {b.author && <div className="muted" style={{ fontSize: 11.5 }}>{b.author}</div>}
                                    </div>
                                    {b.total_pages != null && (
                                        <div className="mono muted" style={{ fontSize: 11 }}>parou na pág {b.current_page} ({b.progress_percent}%)</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {editing !== undefined && <LibraryModal item={editing} onClose={() => setEditing(undefined)} />}
        </AppLayout>
    )
}
```

- [ ] **Step 2: Buildar/typecheck**

Run: `docker compose --profile dev run --rm node sh -c "npm run build"`
Expected: build conclui sem erros de TypeScript.

- [ ] **Step 3: Verificação manual** (`https://vaultus.local/library`)

Conferir: (a) clicar num livro "Em leitura" abre o modal preenchido; (b) trocar status para Concluído revela Conclusão/Avaliação e salva; (c) Excluir pede confirmação e remove; (d) criar livro "Abandonado" faz surgir a seção "Abandonados" com "parou na pág X"; (e) salvar `página atual > total` mostra a mensagem de erro no modal.

- [ ] **Step 4: Commit**

```bash
git add src/resources/js/Pages/Library/Index.tsx
git commit -m "feat(library): livros clicáveis para edição, capas em concluídos e seção abandonados"
```

---

## Self-Review (preenchido pelo autor do plano)

**Cobertura do spec:**
- update/destroy + rotas + posse → Tasks 2, 3. ✅
- `validatedData` (abandoned, current≤total, finished_at default) → Task 1. ✅
- `index` enriquecido + abandoned → Task 4. ✅
- Modal create+edit + erros + excluir + status abandoned → Task 5. ✅
- Index clicável + seção abandonados → Task 6. ✅
- Testes (store, done-default, current>total, update own/403, destroy soft/403, index abandoned) → Tasks 1–4. ✅
- Capas em Concluídos (consequência do `cover_url` agora disponível) → Task 6. ✅ (bônus alinhado ao backlog de auditoria; capa na Fila/Abandonados omitida para manter densidade de lista.)

**Placeholders:** nenhum TBD/TODO; todo passo tem código/comando concreto.

**Consistência de tipos:** `EditableBook` definido na Task 5 é importado na Task 6; campos (`started_at`/`finished_at` ISO, `progress_percent`, `status`) batem com `bookPayload` da Task 4. Labels de exibição (`started_label`, `finished_label`, `added`) definidos no controller (Task 4) e consumidos no front (Task 6).

**Ordem de commits buildáveis:** Tasks 1–4 mantêm o backend verde a cada commit; Task 5 deixa o front buildável (prop `item` opcional, modal ainda chamado sem item até a Task 6); Task 6 liga a edição. Nenhum commit intermediário quebra o app.
