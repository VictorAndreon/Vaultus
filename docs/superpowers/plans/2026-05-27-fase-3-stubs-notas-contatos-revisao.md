# Fase 3 — Stubs: Notas, Contatos e Revisão (CRUD completo)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir as 3 telas stub (Notas, Contatos, Revisão) por implementações completas com Models, Controllers CRUD, seeders e telas editoriais usando o vocabulário visual das Fases 1 e 2.

**Architecture:** 3 domínios novos (`App\Domains\Notes`, `App\Domains\Contacts`, `App\Domains\Reviews`) seguindo o padrão estabelecido (Library/Finance/Habits): Models em `Domains/X/Models/`, Controllers em `Domains/X/Controllers/`, factories em `database/factories/`. Frontend em `Pages/Notes`, `Pages/Contacts`, `Pages/Reviews` reutilizando componentes editoriais (`GradientAvatar`, `MiniCalendar`, `Ring`, `.accent-line`, `Heatmap`, `Sparkline`).

**Tech Stack:** Laravel 12, Inertia, React 19, TypeScript estrito, Eloquent (PostgreSQL com jsonb), factories. Sem novas dependências.

---

## Contexto e estado atual

- **Migrations** já existem para `notebooks`, `notes`, `note_versions`, `contacts`, `reviews` (criadas em 2026-05-07). **Falta**: Models, Controllers, Factories, Seeders.
- **Rotas atuais** em `src/routes/web.php` redirecionam `/notes`, `/contacts`, `/reviews` para `Stub/Index` (placeholder).
- **Schema de contacts não tem email/phone separados** — esta fase adiciona via migration nova (decisão Recomendada).
- **Componentes Fase 1/2 disponíveis**:
  - `@/Components/Greeting`, `GoalIcon`, `GradientAvatar`, `MiniCalendar`
  - `@/Components/charts/Sparkline`, `AreaChart`, `Donut`, `Heatmap`
  - Classes CSS: `.accent-line`, `.ring`, `.check`, `.meter`, `.tag`, `.kicker`, `.card`, `.btn`, `.eyebrow`

---

## File Structure

### Backend

```
src/app/Domains/Notes/
├── Models/
│   ├── Notebook.php             # Caderno de notas (user has many)
│   ├── Note.php                 # Nota individual (belongs to notebook)
│   └── NoteVersion.php          # Versão histórica de nota (belongs to note)
└── Controllers/
    └── NotesController.php      # index, store, update, destroy

src/app/Domains/Contacts/
├── Models/
│   └── Contact.php              # Contato (user has many)
└── Controllers/
    └── ContactsController.php   # index, store, update, destroy

src/app/Domains/Reviews/
├── Models/
│   └── Review.php               # Revisão (user has many)
└── Controllers/
    └── ReviewsController.php    # index, store, update, destroy

src/database/migrations/
└── 2026_05_27_000001_add_email_phone_to_contacts_table.php  # NOVA

src/database/factories/
├── NotebookFactory.php
├── NoteFactory.php
├── ContactFactory.php
└── ReviewFactory.php

src/database/seeders/
├── NotesSeeder.php       # 3 notebooks × 4 notas = 12 notas
├── ContactsSeeder.php    # 12 contatos em 4 categorias
└── ReviewsSeeder.php     # 4 reviews (atual + 3 anteriores)
```

### Frontend

```
src/resources/js/Pages/Notes/
├── Index.tsx                       # Split layout (sidebar + reader)
└── components/
    ├── NoteSidebar.tsx             # Search + agrupamento Fixadas/Todas
    └── NoteReader.tsx              # Painel principal (read + edit)

src/resources/js/Pages/Contacts/
├── Index.tsx                       # Split layout
└── components/
    ├── ContactSidebar.tsx          # Agrupada por categoria + GradientAvatar
    ├── ContactDetail.tsx           # Header avatar grande + chips + grid + timeline
    └── ContactModal.tsx            # Modal de criação/edição

src/resources/js/Pages/Reviews/
├── Index.tsx                       # Hero + grid 2×2 + footer
└── components/
    ├── ReviewSection.tsx           # Uma das 4 seções do grid
    └── ReviewModal.tsx             # Modal criar/editar review

src/resources/js/types/
├── notes.ts
├── contacts.ts
└── reviews.ts
```

### Rotas modificadas

`src/routes/web.php`:
- Remover loop `$stubs = ['notes', 'contacts', 'reviews']`
- Adicionar rotas explícitas (resource-style): `Route::get`, `Route::post`, `Route::patch`, `Route::delete`

### Cleanup

- `src/resources/js/Pages/Stub/Index.tsx` — manter (ainda usado por outros módulos `'Em breve'`)

---

## Decisões de design fixadas

1. **Schema do conteúdo de review** (jsonb `content`) tem 4 chaves:
   ```json
   {
     "funcionou_bem":   [{ "text": "...", "state": "filled" }, ...],
     "pode_melhorar":   [{ "text": "...", "state": "filled" }, ...],
     "aprendizados":    [{ "text": "..." }, ...],
     "proxima_semana":  [{ "text": "...", "state": "empty" }, ...]
   }
   ```
   `state` ∈ `'filled' | 'failed' | 'neutral' | 'empty'` — mapeia para classe `.check` colorida (verde/rose/gold/vazio).

2. **`Review.type`** ∈ `'weekly' | 'monthly' | 'quarterly' | 'annual'`. Fase 3 implementa só `weekly` no frontend; backend aceita os 4 tipos via validation.

3. **Categorias de Contatos** (campo `context`, 50 chars): `'Família'`, `'Trabalho'`, `'Saúde'`, `'Casa'` (4 categorias da spec). O sidebar agrupa por essas 4 categorias + "Outros" para qualquer outro valor.

4. **NoteVersion**: criado automaticamente no `update` do controller quando `content` muda. Não há UI de "ver histórico" nesta fase (deixado para futuro).

5. **Atualização "last_contacted_at"**: handled manualmente pelo usuário via modal (não há botão de "registrar contato hoje" automático nesta fase).

---

## Task 1: Notas — Backend (Models + Migration check + Seeder + Controller)

**Files:**
- Create: `src/app/Domains/Notes/Models/Notebook.php`
- Create: `src/app/Domains/Notes/Models/Note.php`
- Create: `src/app/Domains/Notes/Models/NoteVersion.php`
- Create: `src/database/factories/NotebookFactory.php`
- Create: `src/database/factories/NoteFactory.php`
- Create: `src/database/seeders/NotesSeeder.php`
- Create: `src/app/Domains/Notes/Controllers/NotesController.php`
- Modify: `src/database/seeders/DatabaseSeeder.php` (registrar NotesSeeder)
- Modify: `src/routes/web.php` (rota de notes)

- [ ] **Step 1: Criar `Notebook.php`**

```php
<?php

namespace App\Domains\Notes\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Domains\Auth\Models\User;

class Notebook extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['user_id', 'name', 'color'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function notes(): HasMany
    {
        return $this->hasMany(Note::class);
    }

    protected static function newFactory()
    {
        return \Database\Factories\NotebookFactory::new();
    }
}
```

> Nota: confirme o namespace do model `User` lendo `src/app/Domains/Auth/Models/User.php` (linha do `namespace`). Se for diferente do que está acima, ajuste o `use`.

- [ ] **Step 2: Criar `Note.php`**

```php
<?php

namespace App\Domains\Notes\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Note extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['notebook_id', 'title', 'content', 'is_sensitive', 'tags'];

    protected $casts = [
        'is_sensitive' => 'boolean',
        'tags' => 'array',
    ];

    public function notebook(): BelongsTo
    {
        return $this->belongsTo(Notebook::class);
    }

    public function versions(): HasMany
    {
        return $this->hasMany(NoteVersion::class);
    }

    protected static function newFactory()
    {
        return \Database\Factories\NoteFactory::new();
    }
}
```

- [ ] **Step 3: Criar `NoteVersion.php`**

A tabela `note_versions` tem só `created_at` (sem `updated_at`). Configurar.

```php
<?php

namespace App\Domains\Notes\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NoteVersion extends Model
{
    public $timestamps = false;

    protected $fillable = ['note_id', 'content', 'created_at'];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function note(): BelongsTo
    {
        return $this->belongsTo(Note::class);
    }
}
```

- [ ] **Step 4: Criar `NotebookFactory.php`**

```php
<?php

namespace Database\Factories;

use App\Domains\Auth\Models\User;
use App\Domains\Notes\Models\Notebook;
use Illuminate\Database\Eloquent\Factories\Factory;

class NotebookFactory extends Factory
{
    protected $model = Notebook::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->randomElement(['Inbox', 'Ideias', 'Referência', 'Design', 'Pesquisa']),
            'color' => fake()->randomElement(['#7ec27b', '#d4a55a', '#7faecf', '#c87a8e']),
        ];
    }
}
```

- [ ] **Step 5: Criar `NoteFactory.php`**

```php
<?php

namespace Database\Factories;

use App\Domains\Notes\Models\Note;
use App\Domains\Notes\Models\Notebook;
use Illuminate\Database\Eloquent\Factories\Factory;

class NoteFactory extends Factory
{
    protected $model = Note::class;

    public function definition(): array
    {
        return [
            'notebook_id' => Notebook::factory(),
            'title' => fake()->sentence(rand(3, 6)),
            'content' => fake()->paragraphs(rand(2, 5), true),
            'is_sensitive' => false,
            'tags' => fake()->randomElements(['ideia', 'leitura', 'design', 'código', 'reflexão', 'tarefa'], rand(0, 3)),
        ];
    }
}
```

- [ ] **Step 6: Criar `NotesSeeder.php`**

Conteúdo realista em pt-BR para 3 cadernos × 4 notas:

```php
<?php

namespace Database\Seeders;

use App\Domains\Auth\Models\User;
use App\Domains\Notes\Models\Notebook;
use App\Domains\Notes\Models\Note;
use Illuminate\Database\Seeder;

class NotesSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();
        if (! $user) return;

        $books = [
            ['name' => 'Design',     'color' => '#7ec27b'],
            ['name' => 'Pesquisa',   'color' => '#d4a55a'],
            ['name' => 'Inbox',      'color' => '#7faecf'],
        ];

        $notes = [
            'Design' => [
                ['title' => 'Princípios do Vaultus', 'content' => "Decisão antes de ornamento.\n\nVerde é a única cor com chroma alto — todo o resto é neutro.\n\nSerif para o que importa; mono para o que se conta.", 'tags' => ['design', 'princípios']],
                ['title' => 'Tipografia editorial', 'content' => "Instrument Serif para headings de display. Geist Mono para metadata e números. Geist Sans para corpo.\n\nNunca misturar dois pesos da serif.", 'tags' => ['tipografia', 'design']],
                ['title' => 'OKLCH vs HSL',       'content' => "OKLCH garante linearidade perceptiva — derivar tons fica trivial. HSL não.", 'tags' => ['cor', 'oklch']],
                ['title' => 'Quando usar GoalIcon vs GradientAvatar', 'content' => "GoalIcon: representação categórica (metas, contas). GradientAvatar: pessoas físicas.", 'tags' => ['ícones']],
            ],
            'Pesquisa' => [
                ['title' => 'Atomic habits — chave',     'content' => "Identidade > Processo > Resultado.\n\nSistemas, não metas.", 'tags' => ['leitura', 'hábitos']],
                ['title' => 'Deep Work — capítulo 2',   'content' => "Foco como meta-skill da economia moderna.\n\nSchedule deep work blocks.", 'tags' => ['leitura', 'foco']],
                ['title' => 'Notas sobre OKRs',          'content' => "Objectives: qualitativos, motivacionais. Key results: mensuráveis, com prazo.", 'tags' => ['gestão']],
                ['title' => 'Sistemas de revisão',       'content' => "Revisão semanal: 30 min, sextas. Mensal: 1h. Trimestral: 2h.", 'tags' => ['reflexão']],
            ],
            'Inbox' => [
                ['title' => 'Comprar ração',             'content' => "Acabou ontem. Marca azul, 7kg.", 'tags' => ['tarefa']],
                ['title' => 'Ligar pro contador',        'content' => "Sobre o IR — pendência desde abril.", 'tags' => ['tarefa']],
                ['title' => 'Ideia: timer pomodoro',     'content' => "Componente custom no Vaultus, sem dependência externa.", 'tags' => ['ideia', 'código']],
                ['title' => 'Livro recomendado',         'content' => "\"The Beginning of Infinity\" — David Deutsch. Adicionar à fila.", 'tags' => ['leitura']],
            ],
        ];

        foreach ($books as $bookData) {
            $notebook = Notebook::factory()->create([
                'user_id' => $user->id,
                'name'    => $bookData['name'],
                'color'   => $bookData['color'],
            ]);

            foreach ($notes[$bookData['name']] as $noteData) {
                Note::factory()->create([
                    'notebook_id'  => $notebook->id,
                    'title'        => $noteData['title'],
                    'content'      => $noteData['content'],
                    'is_sensitive' => false,
                    'tags'         => $noteData['tags'],
                ]);
            }
        }
    }
}
```

- [ ] **Step 7: Registrar `NotesSeeder` em `DatabaseSeeder.php`**

Abra `src/database/seeders/DatabaseSeeder.php` e adicione `NotesSeeder::class` na lista de seeders rodados via `$this->call([...])`. Se houver uma chamada existente como `$this->call([UserSeeder::class, ...])`, acrescente `NotesSeeder::class` no fim do array.

- [ ] **Step 8: Criar `NotesController.php` (só `index` por enquanto)**

```php
<?php

namespace App\Domains\Notes\Controllers;

use App\Domains\Notes\Models\Notebook;
use App\Domains\Notes\Models\Note;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;
use Inertia\Response;

class NotesController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $notebooks = Notebook::where('user_id', $user->id)
            ->orderBy('name')
            ->get()
            ->map(fn($nb) => [
                'id'    => $nb->id,
                'name'  => $nb->name,
                'color' => $nb->color,
            ])
            ->values()
            ->toArray();

        $notes = Note::whereHas('notebook', fn($q) => $q->where('user_id', $user->id))
            ->with('notebook:id,name,color')
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(fn($n) => [
                'id'           => $n->id,
                'notebook_id'  => $n->notebook_id,
                'notebook_name'=> $n->notebook->name,
                'notebook_color' => $n->notebook->color,
                'title'        => $n->title,
                'content'      => $n->content,
                'is_sensitive' => $n->is_sensitive,
                'tags'         => $n->tags ?? [],
                'updated_at'   => $n->updated_at->format('d/m/Y H:i'),
                'updated_at_relative' => $n->updated_at->diffForHumans(),
            ])
            ->values()
            ->toArray();

        return Inertia::render('Notes/Index', [
            'notebooks' => $notebooks,
            'notes'     => $notes,
        ]);
    }
}
```

- [ ] **Step 9: Adicionar rota em `web.php`**

Localize o loop `$stubs = ['notes', 'contacts', 'reviews'];` em `src/routes/web.php` e modifique para excluir `'notes'`:

```php
$stubs = ['contacts', 'reviews'];
```

Adicione **antes** do loop:

```php
Route::get('/notes', [\App\Domains\Notes\Controllers\NotesController::class, 'index'])->name('notes');
```

(Mantenha a indentação dentro do grupo `auth` em que está.)

- [ ] **Step 10: Rodar migrations + seed**

```bash
docker compose exec app php artisan migrate --seed
```

Verifique que não há erro. Acesse `https://vaultus.local/notes` — pode renderizar erro de página React (a Index ainda não existe), mas a request HTTP deve completar sem 500.

- [ ] **Step 11: Commit**

```bash
git add src/app/Domains/Notes src/database/factories/NotebookFactory.php src/database/factories/NoteFactory.php src/database/seeders/NotesSeeder.php src/database/seeders/DatabaseSeeder.php src/routes/web.php
git commit -m "feat(notes): models, factory, seeder e controller@index"
```

**NUNCA inclua Co-Authored-By Claude em commits.**

---

## Task 2: Notas — Frontend Index (split layout, read-only)

**Files:**
- Create: `src/resources/js/types/notes.ts`
- Create: `src/resources/js/Pages/Notes/Index.tsx`
- Create: `src/resources/js/Pages/Notes/components/NoteSidebar.tsx`
- Create: `src/resources/js/Pages/Notes/components/NoteReader.tsx`

- [ ] **Step 1: Criar `types/notes.ts`**

```ts
export interface Notebook {
  id: number
  name: string
  color: string | null
}

export interface Note {
  id: number
  notebook_id: number
  notebook_name: string
  notebook_color: string | null
  title: string
  content: string
  is_sensitive: boolean
  tags: string[]
  updated_at: string
  updated_at_relative: string
}

export interface NotesPageProps {
  notebooks: Notebook[]
  notes: Note[]
}
```

- [ ] **Step 2: Criar `NoteSidebar.tsx`**

```tsx
import { Note } from '@/types/notes'

interface Props {
  notes: Note[]
  activeId: number | null
  search: string
  onSearch: (s: string) => void
  onSelect: (id: number) => void
}

export default function NoteSidebar({ notes, activeId, search, onSearch, onSelect }: Props) {
  const filtered = search
    ? notes.filter(n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase())
      )
    : notes

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input
        type="text"
        placeholder="Buscar notas..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: 'var(--surface-2)',
          border: '1px solid var(--line)',
          borderRadius: 6,
          color: 'var(--text)',
          fontSize: 13,
        }}
      />

      <div className="kicker" style={{ marginTop: 8 }}>Todas · {filtered.length}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filtered.length === 0 && (
          <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>
            Nenhuma nota encontrada.
          </div>
        )}
        {filtered.map(n => (
          <button
            key={n.id}
            onClick={() => onSelect(n.id)}
            className={n.id === activeId ? 'accent-line' : ''}
            style={{
              textAlign: 'left',
              padding: '10px 12px',
              background: n.id === activeId ? 'var(--surface-2)' : 'transparent',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              color: 'var(--text)',
              fontFamily: 'inherit',
            }}
          >
            <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 2 }}>{n.title}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'flex', gap: 6, alignItems: 'center' }}>
              <span className="mono">{n.notebook_name}</span>
              <span style={{ color: 'var(--text-4)' }}>·</span>
              <span>{n.updated_at_relative}</span>
            </div>
          </button>
        ))}
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: Criar `NoteReader.tsx`**

```tsx
import { Note } from '@/types/notes'

interface Props {
  note: Note | null
}

export default function NoteReader({ note }: Props) {
  if (!note) {
    return (
      <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-4)', fontStyle: 'italic', fontSize: 14 }}>
        Selecione uma nota para ler.
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 32 }}>
      <div className="eyebrow" style={{ marginBottom: 14 }}>
        <span>{note.notebook_name.toUpperCase()}</span>
        <span>·</span>
        <span>ATUALIZADO {note.updated_at}</span>
      </div>

      <h2 className="h-2" style={{ marginBottom: 18 }}>{note.title}</h2>

      <div style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>
        {note.content}
      </div>

      {note.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}>
          {note.tags.map(tag => (
            <span key={tag} className="tag"><span className="dot" />{tag}</span>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Criar `Notes/Index.tsx`**

```tsx
import { useState } from 'react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { NotesPageProps } from '@/types/notes'
import NoteSidebar from './components/NoteSidebar'
import NoteReader from './components/NoteReader'

export default function NotesIndex({ notebooks: _nb, notes }: NotesPageProps) {
  const [activeId, setActiveId] = useState<number | null>(notes[0]?.id ?? null)
  const [search, setSearch] = useState('')
  const active = notes.find(n => n.id === activeId) ?? null

  return (
    <AppLayout
      title="Notas"
      eyebrow="Acervo"
      subtitle={`${notes.length} notas em ${_nb.length} cadernos.`}
      actions={
        <button className="btn btn-primary btn-sm">
          <Icons.Plus size={13} /> Nova nota
        </button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
        <NoteSidebar
          notes={notes}
          activeId={activeId}
          search={search}
          onSearch={setSearch}
          onSelect={setActiveId}
        />
        <NoteReader note={active} />
      </div>
    </AppLayout>
  )
}
```

- [ ] **Step 5: Validar visualmente**

Acesse `https://vaultus.local/notes`. Esperado:
- Sidebar 320px com search + lista de 12 notas agrupadas só por "Todas · 12"
- Primeira nota selecionada (com `.accent-line` verde)
- Painel direito mostrando título serifado, eyebrow mono, conteúdo, tags
- Clicar em outra nota troca o conteúdo
- Buscar "tipografia" filtra para 1 nota

Tema light deve funcionar via `[data-theme="light"]` (testar trocando manualmente).

- [ ] **Step 6: Commit**

```bash
git add src/resources/js/types/notes.ts src/resources/js/Pages/Notes/
git commit -m "feat(notes): Index split layout com sidebar e reader"
```

---

## Task 3: Notas — CRUD (criar, editar, deletar)

**Files:**
- Modify: `src/app/Domains/Notes/Controllers/NotesController.php` (adicionar store/update/destroy)
- Modify: `src/routes/web.php` (rotas POST/PATCH/DELETE)
- Create: `src/resources/js/Pages/Notes/components/NoteEditor.tsx`
- Modify: `src/resources/js/Pages/Notes/Index.tsx` (botão Nova + integração com editor)
- Modify: `src/resources/js/Pages/Notes/components/NoteReader.tsx` (botão Editar + Deletar)

- [ ] **Step 1: Adicionar `store`, `update`, `destroy` ao `NotesController`**

Acrescente os métodos abaixo (mantendo o `index` existente):

```php
public function store(Request $request)
{
    $user = $request->user();
    $validated = $request->validate([
        'notebook_id' => 'required|integer',
        'title'       => 'required|string|max:255',
        'content'     => 'required|string',
        'tags'        => 'nullable|array',
        'tags.*'      => 'string|max:50',
    ]);

    $notebook = Notebook::where('user_id', $user->id)
        ->where('id', $validated['notebook_id'])
        ->firstOrFail();

    Note::create([
        'notebook_id'  => $notebook->id,
        'title'        => $validated['title'],
        'content'      => $validated['content'],
        'is_sensitive' => false,
        'tags'         => $validated['tags'] ?? [],
    ]);

    return redirect()->route('notes');
}

public function update(Request $request, int $note)
{
    $user = $request->user();
    $noteModel = Note::whereHas('notebook', fn($q) => $q->where('user_id', $user->id))
        ->where('id', $note)
        ->firstOrFail();

    $validated = $request->validate([
        'title'   => 'sometimes|string|max:255',
        'content' => 'sometimes|string',
        'tags'    => 'sometimes|array',
        'tags.*'  => 'string|max:50',
    ]);

    if (isset($validated['content']) && $validated['content'] !== $noteModel->content) {
        \App\Domains\Notes\Models\NoteVersion::create([
            'note_id'    => $noteModel->id,
            'content'    => $noteModel->content,
            'created_at' => now(),
        ]);
    }

    $noteModel->update($validated);

    return redirect()->route('notes');
}

public function destroy(Request $request, int $note)
{
    $user = $request->user();
    $noteModel = Note::whereHas('notebook', fn($q) => $q->where('user_id', $user->id))
        ->where('id', $note)
        ->firstOrFail();

    $noteModel->delete();

    return redirect()->route('notes');
}
```

- [ ] **Step 2: Adicionar rotas em `web.php`**

Logo abaixo da rota `Route::get('/notes', ...)` adicionada na Task 1, acrescente:

```php
Route::post('/notes', [\App\Domains\Notes\Controllers\NotesController::class, 'store']);
Route::patch('/notes/{note}', [\App\Domains\Notes\Controllers\NotesController::class, 'update']);
Route::delete('/notes/{note}', [\App\Domains\Notes\Controllers\NotesController::class, 'destroy']);
```

- [ ] **Step 3: Criar `NoteEditor.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { router } from '@inertiajs/react'
import { Note, Notebook } from '@/types/notes'
import { Icons } from '@/Components/Icons'

interface Props {
  note: Note | null
  notebooks: Notebook[]
  onClose: () => void
}

export default function NoteEditor({ note, notebooks, onClose }: Props) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [content, setContent] = useState(note?.content ?? '')
  const [notebookId, setNotebookId] = useState<number>(note?.notebook_id ?? notebooks[0]?.id ?? 0)
  const [tagsInput, setTagsInput] = useState((note?.tags ?? []).join(', '))

  useEffect(() => {
    setTitle(note?.title ?? '')
    setContent(note?.content ?? '')
    setNotebookId(note?.notebook_id ?? notebooks[0]?.id ?? 0)
    setTagsInput((note?.tags ?? []).join(', '))
  }, [note?.id, notebooks])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
    const payload = { notebook_id: notebookId, title, content, tags }

    if (note) {
      router.patch(`/notes/${note.id}`, payload, { preserveScroll: true, onSuccess: onClose })
    } else {
      router.post('/notes', payload, { preserveScroll: true, onSuccess: onClose })
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', zIndex: 50 }} onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ width: 640, maxWidth: '90vw', maxHeight: '85vh', overflow: 'auto', padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="h-3">{note ? 'Editar nota' : 'Nova nota'}</h3>
          <button type="button" className="icon-btn" onClick={onClose}><Icons.X size={13} /></button>
        </div>

        <label>
          <div className="kicker" style={{ marginBottom: 4 }}>Caderno</div>
          <select
            value={notebookId}
            onChange={(e) => setNotebookId(Number(e.target.value))}
            style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--text)', fontSize: 13 }}
          >
            {notebooks.map(nb => <option key={nb.id} value={nb.id}>{nb.name}</option>)}
          </select>
        </label>

        <label>
          <div className="kicker" style={{ marginBottom: 4 }}>Título</div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--text)', fontSize: 14, fontFamily: 'var(--serif)' }}
          />
        </label>

        <label>
          <div className="kicker" style={{ marginBottom: 4 }}>Conteúdo</div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={10}
            style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--text)', fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical' }}
          />
        </label>

        <label>
          <div className="kicker" style={{ marginBottom: 4 }}>Tags (separadas por vírgula)</div>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="ideia, design, leitura"
            style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--text)', fontSize: 13 }}
          />
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary btn-sm">{note ? 'Salvar' : 'Criar'}</button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Adicionar botões Editar/Deletar ao `NoteReader.tsx`**

Acrescente props `onEdit` e `onDelete`. Conteúdo atualizado:

```tsx
import { Note } from '@/types/notes'
import { Icons } from '@/Components/Icons'

interface Props {
  note: Note | null
  onEdit?: () => void
  onDelete?: () => void
}

export default function NoteReader({ note, onEdit, onDelete }: Props) {
  if (!note) {
    return (
      <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-4)', fontStyle: 'italic', fontSize: 14 }}>
        Selecione uma nota para ler.
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div className="eyebrow">
          <span>{note.notebook_name.toUpperCase()}</span>
          <span>·</span>
          <span>ATUALIZADO {note.updated_at}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {onEdit && <button className="icon-btn" onClick={onEdit} aria-label="Editar"><Icons.Edit size={13} /></button>}
          {onDelete && <button className="icon-btn" onClick={onDelete} aria-label="Deletar"><Icons.Trash size={13} /></button>}
        </div>
      </div>

      <h2 className="h-2" style={{ marginBottom: 18 }}>{note.title}</h2>

      <div style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>
        {note.content}
      </div>

      {note.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}>
          {note.tags.map(tag => (
            <span key={tag} className="tag"><span className="dot" />{tag}</span>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Integrar editor + delete em `Notes/Index.tsx`**

Substitua o conteúdo COMPLETO de `Notes/Index.tsx` por:

```tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { NotesPageProps, Note } from '@/types/notes'
import NoteSidebar from './components/NoteSidebar'
import NoteReader from './components/NoteReader'
import NoteEditor from './components/NoteEditor'

export default function NotesIndex({ notebooks, notes }: NotesPageProps) {
  const [activeId, setActiveId] = useState<number | null>(notes[0]?.id ?? null)
  const [search, setSearch] = useState('')
  const [editorOpen, setEditorOpen] = useState<{ note: Note | null } | null>(null)
  const active = notes.find(n => n.id === activeId) ?? null

  function handleDelete() {
    if (!active) return
    if (!confirm(`Excluir a nota "${active.title}"?`)) return
    router.delete(`/notes/${active.id}`, { preserveScroll: true })
  }

  return (
    <AppLayout
      title="Notas"
      eyebrow="Acervo"
      subtitle={`${notes.length} notas em ${notebooks.length} cadernos.`}
      actions={
        <button className="btn btn-primary btn-sm" onClick={() => setEditorOpen({ note: null })}>
          <Icons.Plus size={13} /> Nova nota
        </button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
        <NoteSidebar
          notes={notes}
          activeId={activeId}
          search={search}
          onSearch={setSearch}
          onSelect={setActiveId}
        />
        <NoteReader
          note={active}
          onEdit={() => active && setEditorOpen({ note: active })}
          onDelete={handleDelete}
        />
      </div>

      {editorOpen && (
        <NoteEditor
          note={editorOpen.note}
          notebooks={notebooks}
          onClose={() => setEditorOpen(null)}
        />
      )}
    </AppLayout>
  )
}
```

- [ ] **Step 6: Validar fluxo CRUD**

Em `https://vaultus.local/notes`:
- Botão "Nova nota" abre modal vazio, criar uma nota, ela aparece na sidebar
- Botão de edição (lápis) abre modal preenchido, editar e salvar atualiza
- Botão de deletar (lixeira) pede confirmação e remove a nota da lista

- [ ] **Step 7: Commit**

```bash
git add src/app/Domains/Notes/Controllers/NotesController.php src/routes/web.php src/resources/js/Pages/Notes/ src/resources/js/types/notes.ts
git commit -m "feat(notes): CRUD store/update/destroy + NoteEditor modal"
```

---

## Task 4: Contatos — Migration estender com email/phone

**Files:**
- Create: `src/database/migrations/2026_05_27_000001_add_email_phone_to_contacts_table.php`

- [ ] **Step 1: Criar migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            $table->string('email')->nullable()->after('name');
            $table->string('phone', 32)->nullable()->after('email');
        });
    }

    public function down(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            $table->dropColumn(['email', 'phone']);
        });
    }
};
```

- [ ] **Step 2: Rodar migration**

```bash
docker compose exec app php artisan migrate
```

Verifique a saída: `2026_05_27_000001_add_email_phone_to_contacts_table` deve aparecer como `Done`.

- [ ] **Step 3: Commit**

```bash
git add src/database/migrations/2026_05_27_000001_add_email_phone_to_contacts_table.php
git commit -m "feat(contacts): migration adiciona email e phone"
```

---

## Task 5: Contatos — Backend (model + factory + seeder + controller@index)

**Files:**
- Create: `src/app/Domains/Contacts/Models/Contact.php`
- Create: `src/app/Domains/Contacts/Controllers/ContactsController.php`
- Create: `src/database/factories/ContactFactory.php`
- Create: `src/database/seeders/ContactsSeeder.php`
- Modify: `src/database/seeders/DatabaseSeeder.php`
- Modify: `src/routes/web.php`

- [ ] **Step 1: Criar `Contact.php`**

```php
<?php

namespace App\Domains\Contacts\Models;

use App\Domains\Auth\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Contact extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id', 'name', 'email', 'phone', 'photo', 'birthday',
        'context', 'next_step', 'last_contacted_at', 'remind_after_days', 'notes',
    ];

    protected $casts = [
        'birthday' => 'date',
        'last_contacted_at' => 'date',
        'remind_after_days' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected static function newFactory()
    {
        return \Database\Factories\ContactFactory::new();
    }
}
```

- [ ] **Step 2: Criar `ContactFactory.php`**

```php
<?php

namespace Database\Factories;

use App\Domains\Auth\Models\User;
use App\Domains\Contacts\Models\Contact;
use Illuminate\Database\Eloquent\Factories\Factory;

class ContactFactory extends Factory
{
    protected $model = Contact::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name'    => fake()->name(),
            'email'   => fake()->safeEmail(),
            'phone'   => fake()->phoneNumber(),
            'photo'   => null,
            'birthday'=> fake()->date(),
            'context' => fake()->randomElement(['Família', 'Trabalho', 'Saúde', 'Casa']),
            'next_step' => fake()->optional()->sentence(rand(3, 6)),
            'last_contacted_at' => fake()->optional()->dateTimeBetween('-90 days', 'now'),
            'remind_after_days' => fake()->optional()->numberBetween(7, 90),
            'notes'   => fake()->optional()->paragraph(),
        ];
    }
}
```

- [ ] **Step 3: Criar `ContactsSeeder.php`**

```php
<?php

namespace Database\Seeders;

use App\Domains\Auth\Models\User;
use App\Domains\Contacts\Models\Contact;
use Illuminate\Database\Seeder;

class ContactsSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();
        if (! $user) return;

        $contacts = [
            // Família
            ['name' => 'Heloísa Camargo',   'email' => 'helo@gmail.com',     'phone' => '(11) 99812-4501', 'context' => 'Família',  'birthday' => '1962-03-14', 'next_step' => 'Ligar no fim de semana', 'last_contacted_at' => '2026-05-19', 'remind_after_days' => 14],
            ['name' => 'Paulo Andreon',     'email' => 'paulo.andreon@yahoo.com', 'phone' => '(11) 99840-3322', 'context' => 'Família', 'birthday' => '1958-11-02', 'last_contacted_at' => '2026-05-12', 'remind_after_days' => 21],
            ['name' => 'Mariana Camargo',   'email' => null,                 'phone' => '(11) 98301-7720', 'context' => 'Família',  'birthday' => '1990-07-22', 'next_step' => 'Marcar almoço', 'last_contacted_at' => '2026-04-30', 'remind_after_days' => 30],
            // Trabalho
            ['name' => 'Renato Mendes',     'email' => 'renato@empresa.com', 'phone' => '(11) 97520-1144', 'context' => 'Trabalho', 'birthday' => '1985-09-08', 'next_step' => 'Revisar proposta de design', 'last_contacted_at' => '2026-05-25'],
            ['name' => 'Larissa Tavares',   'email' => 'lari@empresa.com',   'phone' => '(11) 97604-8821', 'context' => 'Trabalho', 'birthday' => '1992-12-30', 'last_contacted_at' => '2026-05-23'],
            ['name' => 'Bruno Lacerda',     'email' => 'bruno@cliente.com',  'phone' => '(21) 98722-1190', 'context' => 'Trabalho', 'birthday' => '1979-04-11', 'next_step' => 'Enviar resumo de projeto', 'last_contacted_at' => '2026-05-15', 'remind_after_days' => 7],
            // Saúde
            ['name' => 'Dra. Patrícia Aoki','email' => 'consulta@clinica.com', 'phone' => '(11) 3251-0099', 'context' => 'Saúde',    'birthday' => null,         'next_step' => 'Agendar retorno semestral', 'last_contacted_at' => '2025-12-10'],
            ['name' => 'Dr. Marcos Silva',  'email' => null,                 'phone' => '(11) 3422-7702', 'context' => 'Saúde',    'birthday' => null,         'last_contacted_at' => '2026-02-04'],
            // Casa
            ['name' => 'Síndico Carlos',    'email' => null,                 'phone' => '(11) 3987-4400', 'context' => 'Casa',     'birthday' => null,         'next_step' => 'Pagar condomínio mai', 'last_contacted_at' => '2026-05-02'],
            ['name' => 'Diarista Sandra',   'email' => null,                 'phone' => '(11) 98712-3344', 'context' => 'Casa',     'birthday' => '1968-06-18', 'last_contacted_at' => '2026-05-24'],
            ['name' => 'Eletricista João',  'email' => null,                 'phone' => '(11) 98200-9911', 'context' => 'Casa',     'birthday' => null,         'last_contacted_at' => '2025-11-30'],
            ['name' => 'Padaria Bella',     'email' => null,                 'phone' => '(11) 3022-1188', 'context' => 'Casa',     'birthday' => null,         'last_contacted_at' => null],
        ];

        foreach ($contacts as $c) {
            Contact::factory()->create(array_merge(['user_id' => $user->id], $c));
        }
    }
}
```

- [ ] **Step 4: Registrar seeder**

Adicionar `ContactsSeeder::class` ao array em `DatabaseSeeder.php` (depois do `NotesSeeder::class`).

- [ ] **Step 5: Criar `ContactsController.php` (só index)**

```php
<?php

namespace App\Domains\Contacts\Controllers;

use App\Domains\Contacts\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;
use Inertia\Response;

class ContactsController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $contacts = Contact::where('user_id', $user->id)
            ->orderBy('name')
            ->get()
            ->map(function ($c) {
                $initials = collect(explode(' ', $c->name))
                    ->map(fn($p) => mb_substr($p, 0, 1))
                    ->take(2)
                    ->implode('');

                $upcomingBirthday = null;
                if ($c->birthday) {
                    $thisYear = $c->birthday->copy()->setYear(now()->year);
                    $next = $thisYear->isPast() ? $thisYear->addYear() : $thisYear;
                    $upcomingBirthday = [
                        'date'      => $next->format('d/m'),
                        'days_away' => (int) now()->startOfDay()->diffInDays($next, false),
                    ];
                }

                return [
                    'id'        => $c->id,
                    'name'      => $c->name,
                    'initials'  => mb_strtoupper($initials),
                    'email'     => $c->email,
                    'phone'     => $c->phone,
                    'photo'     => $c->photo,
                    'birthday'  => $c->birthday?->format('d/m/Y'),
                    'context'   => $c->context,
                    'next_step' => $c->next_step,
                    'last_contacted_at' => $c->last_contacted_at?->format('d/m/Y'),
                    'last_contacted_relative' => $c->last_contacted_at?->diffForHumans(),
                    'remind_after_days' => $c->remind_after_days,
                    'notes'     => $c->notes,
                    'upcoming_birthday' => $upcomingBirthday,
                ];
            })
            ->values()
            ->toArray();

        return Inertia::render('Contacts/Index', [
            'contacts' => $contacts,
        ]);
    }
}
```

- [ ] **Step 6: Adicionar rota**

Em `src/routes/web.php`, atualizar o array de stubs para excluir `'contacts'`:

```php
$stubs = ['reviews'];
```

E adicionar antes do loop:

```php
Route::get('/contacts', [\App\Domains\Contacts\Controllers\ContactsController::class, 'index'])->name('contacts');
```

- [ ] **Step 7: Rodar seed**

```bash
docker compose exec app php artisan db:seed --class=ContactsSeeder
```

Verificar saída: deve criar 12 contatos.

- [ ] **Step 8: Commit**

```bash
git add src/app/Domains/Contacts src/database/factories/ContactFactory.php src/database/seeders/ContactsSeeder.php src/database/seeders/DatabaseSeeder.php src/routes/web.php
git commit -m "feat(contacts): model, factory, seeder e controller@index"
```

---

## Task 6: Contatos — Frontend Index (split layout, read-only)

**Files:**
- Create: `src/resources/js/types/contacts.ts`
- Create: `src/resources/js/Pages/Contacts/Index.tsx`
- Create: `src/resources/js/Pages/Contacts/components/ContactSidebar.tsx`
- Create: `src/resources/js/Pages/Contacts/components/ContactDetail.tsx`

- [ ] **Step 1: Criar `types/contacts.ts`**

```ts
export interface UpcomingBirthday {
  date: string         // dd/mm
  days_away: number    // dias até a data
}

export interface Contact {
  id: number
  name: string
  initials: string
  email: string | null
  phone: string | null
  photo: string | null
  birthday: string | null
  context: string | null
  next_step: string | null
  last_contacted_at: string | null
  last_contacted_relative: string | null
  remind_after_days: number | null
  notes: string | null
  upcoming_birthday: UpcomingBirthday | null
}

export interface ContactsPageProps {
  contacts: Contact[]
}
```

- [ ] **Step 2: Criar `ContactSidebar.tsx`**

```tsx
import { Contact } from '@/types/contacts'
import GradientAvatar from '@/Components/GradientAvatar'

const CATEGORIES = ['Família', 'Trabalho', 'Saúde', 'Casa'] as const

interface Props {
  contacts: Contact[]
  activeId: number | null
  onSelect: (id: number) => void
}

function groupContacts(contacts: Contact[]): Record<string, Contact[]> {
  const groups: Record<string, Contact[]> = { Família: [], Trabalho: [], Saúde: [], Casa: [], Outros: [] }
  for (const c of contacts) {
    const key = (CATEGORIES as readonly string[]).includes(c.context ?? '') ? c.context! : 'Outros'
    groups[key].push(c)
  }
  return groups
}

const CATEGORY_HUE: Record<string, number> = {
  'Família':  140,
  'Trabalho':  60,
  'Saúde':    230,
  'Casa':     320,
}

export default function ContactSidebar({ contacts, activeId, onSelect }: Props) {
  const groups = groupContacts(contacts)
  const visibleCategories = [...CATEGORIES, 'Outros'].filter(cat => groups[cat].length > 0)

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {visibleCategories.map(cat => (
        <div key={cat}>
          <div className="kicker" style={{ marginBottom: 8 }}>{cat.toUpperCase()} · {groups[cat].length}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {groups[cat].map(c => (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={c.id === activeId ? 'accent-line' : ''}
                style={{
                  textAlign: 'left',
                  padding: '8px 10px',
                  background: c.id === activeId ? 'var(--surface-2)' : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: 'var(--text)',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <GradientAvatar initials={c.initials} size={28} hue={CATEGORY_HUE[cat]} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                  {c.next_step && <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.next_step}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </aside>
  )
}
```

- [ ] **Step 3: Criar `ContactDetail.tsx`**

```tsx
import { Contact } from '@/types/contacts'
import GradientAvatar from '@/Components/GradientAvatar'
import { Icons } from '@/Components/Icons'

const CATEGORY_HUE: Record<string, number> = {
  'Família': 140, 'Trabalho': 60, 'Saúde': 230, 'Casa': 320,
}

interface Props {
  contact: Contact | null
  onEdit?: () => void
  onDelete?: () => void
}

export default function ContactDetail({ contact, onEdit, onDelete }: Props) {
  if (!contact) {
    return (
      <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-4)', fontStyle: 'italic', fontSize: 14 }}>
        Selecione um contato para ver detalhes.
      </div>
    )
  }

  const hue = CATEGORY_HUE[contact.context ?? ''] ?? 140
  const upcoming = contact.upcoming_birthday

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18 }}>
          <GradientAvatar initials={contact.initials} size={72} hue={hue} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="h-2" style={{ marginBottom: 4 }}>{contact.name}</h2>
            {contact.context && <span className="tag tag-green"><span className="dot" />{contact.context}</span>}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {onEdit && <button className="icon-btn" onClick={onEdit} aria-label="Editar"><Icons.Edit size={13} /></button>}
            {onDelete && <button className="icon-btn" onClick={onDelete} aria-label="Deletar"><Icons.Trash size={13} /></button>}
          </div>
        </div>

        {(contact.email || contact.phone) && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
            {contact.email && (
              <span className="tag" style={{ background: 'var(--surface-2)' }}>
                <Icons.Star size={11} /> {contact.email}
              </span>
            )}
            {contact.phone && (
              <span className="tag" style={{ background: 'var(--surface-2)' }}>
                <Icons.Star size={11} /> {contact.phone}
              </span>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}>
          <div>
            <div className="kicker">Aniversário</div>
            <div className="mono" style={{ fontSize: 13, marginTop: 4 }}>{contact.birthday ?? '—'}</div>
          </div>
          <div>
            <div className="kicker">Último contato</div>
            <div className="mono" style={{ fontSize: 13, marginTop: 4 }}>{contact.last_contacted_relative ?? '—'}</div>
          </div>
          <div>
            <div className="kicker">Próximo passo</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>{contact.next_step ?? '—'}</div>
          </div>
          <div>
            <div className="kicker">Lembrar a cada</div>
            <div className="mono" style={{ fontSize: 13, marginTop: 4 }}>{contact.remind_after_days ? `${contact.remind_after_days} dias` : '—'}</div>
          </div>
        </div>

        {contact.notes && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}>
            <div className="kicker" style={{ marginBottom: 6 }}>Notas</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{contact.notes}</div>
          </div>
        )}
      </div>

      {upcoming && upcoming.days_away <= 30 && upcoming.days_away >= 0 && (
        <div className="card accent-line" style={{ padding: 18 }}>
          <div className="kicker">PRÓXIMO · ANIVERSÁRIO</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, marginTop: 4 }}>
            {upcoming.days_away === 0 ? 'Hoje' : `Em ${upcoming.days_away} dia${upcoming.days_away > 1 ? 's' : ''}`}
            <span className="mono muted" style={{ fontSize: 13, marginLeft: 8 }}>· {upcoming.date}</span>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Criar `Contacts/Index.tsx`**

```tsx
import { useState } from 'react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { ContactsPageProps } from '@/types/contacts'
import ContactSidebar from './components/ContactSidebar'
import ContactDetail from './components/ContactDetail'

export default function ContactsIndex({ contacts }: ContactsPageProps) {
  const [activeId, setActiveId] = useState<number | null>(contacts[0]?.id ?? null)
  const active = contacts.find(c => c.id === activeId) ?? null

  return (
    <AppLayout
      title="Contatos"
      eyebrow="Rede"
      subtitle={`${contacts.length} pessoas, com contexto.`}
      actions={
        <button className="btn btn-primary btn-sm">
          <Icons.Plus size={13} /> Novo contato
        </button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
        <ContactSidebar
          contacts={contacts}
          activeId={activeId}
          onSelect={setActiveId}
        />
        <ContactDetail contact={active} />
      </div>
    </AppLayout>
  )
}
```

- [ ] **Step 5: Validar visualmente**

Em `https://vaultus.local/contacts`:
- Sidebar agrupada por categoria (Família/Trabalho/Saúde/Casa)
- Avatar gradient verde-ish para Família, gold para Trabalho, sky para Saúde, púrpura para Casa
- Primeiro contato selecionado (`.accent-line` verde)
- Detail card com avatar 72px, chips de email/telefone (se houver), grid 2×2 de detalhes
- Card "PRÓXIMO · ANIVERSÁRIO" aparece quando há aniversário em ≤30 dias

- [ ] **Step 6: Commit**

```bash
git add src/resources/js/types/contacts.ts src/resources/js/Pages/Contacts/
git commit -m "feat(contacts): Index split layout com sidebar agrupada e detail"
```

---

## Task 7: Contatos — CRUD (modal create/edit + delete)

**Files:**
- Modify: `src/app/Domains/Contacts/Controllers/ContactsController.php`
- Modify: `src/routes/web.php`
- Create: `src/resources/js/Pages/Contacts/components/ContactModal.tsx`
- Modify: `src/resources/js/Pages/Contacts/Index.tsx`

- [ ] **Step 1: Adicionar `store`, `update`, `destroy` ao `ContactsController`**

```php
public function store(Request $request)
{
    $validated = $this->validatedData($request);
    \App\Domains\Contacts\Models\Contact::create(array_merge(['user_id' => $request->user()->id], $validated));
    return redirect()->route('contacts');
}

public function update(Request $request, int $contact)
{
    $model = \App\Domains\Contacts\Models\Contact::where('user_id', $request->user()->id)
        ->where('id', $contact)
        ->firstOrFail();
    $model->update($this->validatedData($request));
    return redirect()->route('contacts');
}

public function destroy(Request $request, int $contact)
{
    \App\Domains\Contacts\Models\Contact::where('user_id', $request->user()->id)
        ->where('id', $contact)
        ->firstOrFail()
        ->delete();
    return redirect()->route('contacts');
}

private function validatedData(Request $request): array
{
    return $request->validate([
        'name'              => 'required|string|max:255',
        'email'             => 'nullable|email|max:255',
        'phone'             => 'nullable|string|max:32',
        'birthday'          => 'nullable|date',
        'context'           => 'nullable|string|max:50',
        'next_step'         => 'nullable|string|max:255',
        'last_contacted_at' => 'nullable|date',
        'remind_after_days' => 'nullable|integer|min:1|max:365',
        'notes'             => 'nullable|string',
    ]);
}
```

- [ ] **Step 2: Adicionar rotas em `web.php`**

Logo abaixo da rota `Route::get('/contacts', ...)`:

```php
Route::post('/contacts', [\App\Domains\Contacts\Controllers\ContactsController::class, 'store']);
Route::patch('/contacts/{contact}', [\App\Domains\Contacts\Controllers\ContactsController::class, 'update']);
Route::delete('/contacts/{contact}', [\App\Domains\Contacts\Controllers\ContactsController::class, 'destroy']);
```

- [ ] **Step 3: Criar `ContactModal.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { router } from '@inertiajs/react'
import { Contact } from '@/types/contacts'
import { Icons } from '@/Components/Icons'

const CATEGORIES = ['Família', 'Trabalho', 'Saúde', 'Casa'] as const

interface Props {
  contact: Contact | null
  onClose: () => void
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function isoFromBR(brDate: string | null): string {
  if (!brDate) return ''
  const [d, m, y] = brDate.split('/')
  if (!d || !m || !y) return ''
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

export default function ContactModal({ contact, onClose }: Props) {
  const [name, setName] = useState(contact?.name ?? '')
  const [email, setEmail] = useState(contact?.email ?? '')
  const [phone, setPhone] = useState(contact?.phone ?? '')
  const [birthday, setBirthday] = useState(isoFromBR(contact?.birthday ?? null))
  const [context, setContext] = useState(contact?.context ?? CATEGORIES[0])
  const [nextStep, setNextStep] = useState(contact?.next_step ?? '')
  const [lastContacted, setLastContacted] = useState(isoFromBR(contact?.last_contacted_at ?? null))
  const [remindDays, setRemindDays] = useState<string>(contact?.remind_after_days?.toString() ?? '')
  const [notes, setNotes] = useState(contact?.notes ?? '')

  useEffect(() => {
    setName(contact?.name ?? '')
    setEmail(contact?.email ?? '')
    setPhone(contact?.phone ?? '')
    setBirthday(isoFromBR(contact?.birthday ?? null))
    setContext(contact?.context ?? CATEGORIES[0])
    setNextStep(contact?.next_step ?? '')
    setLastContacted(isoFromBR(contact?.last_contacted_at ?? null))
    setRemindDays(contact?.remind_after_days?.toString() ?? '')
    setNotes(contact?.notes ?? '')
  }, [contact?.id])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      name,
      email: email || null,
      phone: phone || null,
      birthday: birthday || null,
      context,
      next_step: nextStep || null,
      last_contacted_at: lastContacted || null,
      remind_after_days: remindDays ? Number(remindDays) : null,
      notes: notes || null,
    }
    if (contact) {
      router.patch(`/contacts/${contact.id}`, payload, { preserveScroll: true, onSuccess: onClose })
    } else {
      router.post('/contacts', payload, { preserveScroll: true, onSuccess: onClose })
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', background: 'var(--surface-2)',
    border: '1px solid var(--line)', borderRadius: 6, color: 'var(--text)', fontSize: 13,
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
          <h3 className="h-3">{contact ? 'Editar contato' : 'Novo contato'}</h3>
          <button type="button" className="icon-btn" onClick={onClose}><Icons.X size={13} /></button>
        </div>

        <label>
          <div className="kicker" style={{ marginBottom: 4 }}>Nome</div>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Email</div>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          </label>
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Telefone</div>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Categoria</div>
            <select value={context} onChange={(e) => setContext(e.target.value)} style={inputStyle}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Aniversário</div>
            <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} max={todayIso()} style={inputStyle} />
          </label>
        </div>

        <label>
          <div className="kicker" style={{ marginBottom: 4 }}>Próximo passo</div>
          <input type="text" value={nextStep} onChange={(e) => setNextStep(e.target.value)} style={inputStyle} />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Último contato</div>
            <input type="date" value={lastContacted} onChange={(e) => setLastContacted(e.target.value)} max={todayIso()} style={inputStyle} />
          </label>
          <label>
            <div className="kicker" style={{ marginBottom: 4 }}>Lembrar a cada (dias)</div>
            <input type="number" min={1} max={365} value={remindDays} onChange={(e) => setRemindDays(e.target.value)} style={inputStyle} />
          </label>
        </div>

        <label>
          <div className="kicker" style={{ marginBottom: 4 }}>Notas</div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
            style={{ ...inputStyle, lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit' }} />
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary btn-sm">{contact ? 'Salvar' : 'Criar'}</button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Integrar modal em `Contacts/Index.tsx`**

Substituir conteúdo de `Contacts/Index.tsx` por:

```tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { ContactsPageProps, Contact } from '@/types/contacts'
import ContactSidebar from './components/ContactSidebar'
import ContactDetail from './components/ContactDetail'
import ContactModal from './components/ContactModal'

export default function ContactsIndex({ contacts }: ContactsPageProps) {
  const [activeId, setActiveId] = useState<number | null>(contacts[0]?.id ?? null)
  const [modal, setModal] = useState<{ contact: Contact | null } | null>(null)
  const active = contacts.find(c => c.id === activeId) ?? null

  function handleDelete() {
    if (!active) return
    if (!confirm(`Excluir o contato "${active.name}"?`)) return
    router.delete(`/contacts/${active.id}`, { preserveScroll: true })
  }

  return (
    <AppLayout
      title="Contatos"
      eyebrow="Rede"
      subtitle={`${contacts.length} pessoas, com contexto.`}
      actions={
        <button className="btn btn-primary btn-sm" onClick={() => setModal({ contact: null })}>
          <Icons.Plus size={13} /> Novo contato
        </button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
        <ContactSidebar
          contacts={contacts}
          activeId={activeId}
          onSelect={setActiveId}
        />
        <ContactDetail
          contact={active}
          onEdit={() => active && setModal({ contact: active })}
          onDelete={handleDelete}
        />
      </div>

      {modal && (
        <ContactModal
          contact={modal.contact}
          onClose={() => setModal(null)}
        />
      )}
    </AppLayout>
  )
}
```

- [ ] **Step 5: Validar fluxo CRUD**

Em `https://vaultus.local/contacts`:
- "Novo contato" abre modal vazio → criar → aparece no grupo da categoria escolhida
- Editar contato abre modal preenchido (datas em ISO no input) → salvar → atualiza
- Deletar pede confirmação e remove

- [ ] **Step 6: Commit**

```bash
git add src/app/Domains/Contacts/Controllers/ContactsController.php src/routes/web.php src/resources/js/Pages/Contacts/
git commit -m "feat(contacts): CRUD store/update/destroy + ContactModal"
```

---

## Task 8: Revisão — Backend (model + factory + seeder + controller)

**Files:**
- Create: `src/app/Domains/Reviews/Models/Review.php`
- Create: `src/app/Domains/Reviews/Controllers/ReviewsController.php`
- Create: `src/database/factories/ReviewFactory.php`
- Create: `src/database/seeders/ReviewsSeeder.php`
- Modify: `src/database/seeders/DatabaseSeeder.php`
- Modify: `src/routes/web.php`

- [ ] **Step 1: Criar `Review.php`**

```php
<?php

namespace App\Domains\Reviews\Models;

use App\Domains\Auth\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Review extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['user_id', 'type', 'period_start', 'period_end', 'content'];

    protected $casts = [
        'period_start' => 'date',
        'period_end'   => 'date',
        'content'      => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected static function newFactory()
    {
        return \Database\Factories\ReviewFactory::new();
    }
}
```

- [ ] **Step 2: Criar `ReviewFactory.php`**

```php
<?php

namespace Database\Factories;

use App\Domains\Auth\Models\User;
use App\Domains\Reviews\Models\Review;
use Illuminate\Database\Eloquent\Factories\Factory;

class ReviewFactory extends Factory
{
    protected $model = Review::class;

    public function definition(): array
    {
        return [
            'user_id'      => User::factory(),
            'type'         => 'weekly',
            'period_start' => now()->startOfWeek(),
            'period_end'   => now()->endOfWeek(),
            'content'      => $this->emptyContent(),
        ];
    }

    public function emptyContent(): array
    {
        return [
            'funcionou_bem'  => [],
            'pode_melhorar'  => [],
            'aprendizados'   => [],
            'proxima_semana' => [],
        ];
    }
}
```

- [ ] **Step 3: Criar `ReviewsSeeder.php`**

```php
<?php

namespace Database\Seeders;

use App\Domains\Auth\Models\User;
use App\Domains\Reviews\Models\Review;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class ReviewsSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();
        if (! $user) return;

        $weeks = [
            // Semana atual — em andamento (alguns itens vazios)
            [
                'offset_weeks' => 0,
                'content' => [
                    'funcionou_bem'  => [
                        ['text' => 'Fechei a Fase 1 do design system Vaultus',  'state' => 'filled'],
                        ['text' => 'Manhãs de leitura com café',                  'state' => 'filled'],
                    ],
                    'pode_melhorar'  => [
                        ['text' => 'Dormir antes da meia-noite',                  'state' => 'failed'],
                        ['text' => 'Menos screen time depois do jantar',          'state' => 'neutral'],
                    ],
                    'aprendizados'   => [
                        ['text' => 'OKLCH é um superpoder pra design systems'],
                        ['text' => 'Subagent-driven dev escala bem em planos densos'],
                    ],
                    'proxima_semana' => [
                        ['text' => 'Começar Fase 3 dos stubs',                    'state' => 'empty'],
                        ['text' => 'Reavaliar metas de Q2',                       'state' => 'empty'],
                    ],
                ],
            ],
            // Semana passada
            [
                'offset_weeks' => -1,
                'content' => [
                    'funcionou_bem'  => [['text' => 'Migrei todas as telas para o vocabulário editorial', 'state' => 'filled']],
                    'pode_melhorar'  => [['text' => 'Mais pausas entre tasks intensas', 'state' => 'failed']],
                    'aprendizados'   => [['text' => 'Decomposição clara economiza horas de debug']],
                    'proxima_semana' => [['text' => 'Implementar Fase 1 do DS', 'state' => 'filled']],
                ],
            ],
            // 2 semanas atrás
            [
                'offset_weeks' => -2,
                'content' => [
                    'funcionou_bem'  => [['text' => 'Brainstorm fechou plano coeso da Fase 1+2+3', 'state' => 'filled']],
                    'pode_melhorar'  => [['text' => 'Documentar decisões assim que tomar', 'state' => 'neutral']],
                    'aprendizados'   => [['text' => 'O PDF inicial codifica princípios — não detalhes']],
                    'proxima_semana' => [['text' => 'Migrar telas existentes', 'state' => 'filled']],
                ],
            ],
        ];

        foreach ($weeks as $w) {
            $start = Carbon::now()->addWeeks($w['offset_weeks'])->startOfWeek();
            $end   = $start->copy()->endOfWeek();

            Review::create([
                'user_id'      => $user->id,
                'type'         => 'weekly',
                'period_start' => $start,
                'period_end'   => $end,
                'content'      => $w['content'],
            ]);
        }
    }
}
```

- [ ] **Step 4: Registrar `ReviewsSeeder` em `DatabaseSeeder.php`**

Adicionar `ReviewsSeeder::class` ao array.

- [ ] **Step 5: Criar `ReviewsController.php`**

```php
<?php

namespace App\Domains\Reviews\Controllers;

use App\Domains\Reviews\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;
use Inertia\Response;

class ReviewsController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $reviews = Review::where('user_id', $user->id)
            ->orderBy('period_start', 'desc')
            ->get()
            ->map(fn($r) => $this->serialize($r))
            ->values()
            ->toArray();

        $currentWeekStart = now()->startOfWeek()->format('Y-m-d');
        $current = collect($reviews)->firstWhere('period_start_iso', $currentWeekStart);

        return Inertia::render('Reviews/Index', [
            'reviews'  => $reviews,
            'current'  => $current,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validatedData($request);
        Review::create(array_merge(['user_id' => $request->user()->id], $validated));
        return redirect()->route('reviews');
    }

    public function update(Request $request, int $review)
    {
        $model = Review::where('user_id', $request->user()->id)
            ->where('id', $review)
            ->firstOrFail();
        $model->update($this->validatedData($request));
        return redirect()->route('reviews');
    }

    public function destroy(Request $request, int $review)
    {
        Review::where('user_id', $request->user()->id)
            ->where('id', $review)
            ->firstOrFail()
            ->delete();
        return redirect()->route('reviews');
    }

    private function validatedData(Request $request): array
    {
        return $request->validate([
            'type'         => 'required|string|in:weekly,monthly,quarterly,annual',
            'period_start' => 'required|date',
            'period_end'   => 'required|date|after_or_equal:period_start',
            'content'      => 'required|array',
            'content.funcionou_bem'    => 'array',
            'content.pode_melhorar'    => 'array',
            'content.aprendizados'     => 'array',
            'content.proxima_semana'   => 'array',
        ]);
    }

    private function serialize(Review $r): array
    {
        $weekNumber = $r->period_start->weekOfYear;
        $year = $r->period_start->year;
        $content = $r->content ?? [];

        $filled = collect($content)->flatten(1)
            ->filter(fn($item) => is_array($item) && ($item['state'] ?? null) === 'filled')
            ->count();
        $total = collect($content)->flatten(1)->filter(fn($item) => is_array($item))->count();

        return [
            'id'              => $r->id,
            'type'            => $r->type,
            'period_start'    => $r->period_start->format('d/m/Y'),
            'period_start_iso'=> $r->period_start->format('Y-m-d'),
            'period_end'      => $r->period_end->format('d/m/Y'),
            'week_number'     => $weekNumber,
            'year'            => $year,
            'completion_pct'  => $total > 0 ? (int) round($filled / $total * 100) : 0,
            'content'         => [
                'funcionou_bem'  => $content['funcionou_bem']  ?? [],
                'pode_melhorar'  => $content['pode_melhorar']  ?? [],
                'aprendizados'   => $content['aprendizados']   ?? [],
                'proxima_semana' => $content['proxima_semana'] ?? [],
            ],
        ];
    }
}
```

- [ ] **Step 6: Atualizar `web.php`**

Remover `'reviews'` do array `$stubs` (que vai ficar vazio — pode remover o loop inteiro também):

```php
// Substituir o bloco:
//   $stubs = ['reviews'];
//   foreach ($stubs as $module) { ... }
// Por:
```

E adicionar:

```php
Route::get('/reviews', [\App\Domains\Reviews\Controllers\ReviewsController::class, 'index'])->name('reviews');
Route::post('/reviews', [\App\Domains\Reviews\Controllers\ReviewsController::class, 'store']);
Route::patch('/reviews/{review}', [\App\Domains\Reviews\Controllers\ReviewsController::class, 'update']);
Route::delete('/reviews/{review}', [\App\Domains\Reviews\Controllers\ReviewsController::class, 'destroy']);
```

- [ ] **Step 7: Rodar seed**

```bash
docker compose exec app php artisan db:seed --class=ReviewsSeeder
```

Saída esperada: 3 reviews criadas.

- [ ] **Step 8: Commit**

```bash
git add src/app/Domains/Reviews src/database/factories/ReviewFactory.php src/database/seeders/ReviewsSeeder.php src/database/seeders/DatabaseSeeder.php src/routes/web.php
git commit -m "feat(reviews): model, factory, seeder e controller CRUD"
```

---

## Task 9: Revisão — Frontend Index (hero + grid 2×2 + footer)

**Files:**
- Create: `src/resources/js/types/reviews.ts`
- Create: `src/resources/js/Pages/Reviews/Index.tsx`
- Create: `src/resources/js/Pages/Reviews/components/ReviewSection.tsx`

- [ ] **Step 1: Criar `types/reviews.ts`**

```ts
export type CheckState = 'filled' | 'failed' | 'neutral' | 'empty'

export interface ReviewItem {
  text: string
  state?: CheckState
}

export interface ReviewContent {
  funcionou_bem: ReviewItem[]
  pode_melhorar: ReviewItem[]
  aprendizados: ReviewItem[]
  proxima_semana: ReviewItem[]
}

export interface Review {
  id: number
  type: 'weekly' | 'monthly' | 'quarterly' | 'annual'
  period_start: string         // dd/mm/yyyy
  period_start_iso: string     // yyyy-mm-dd
  period_end: string
  week_number: number
  year: number
  completion_pct: number
  content: ReviewContent
}

export interface ReviewsPageProps {
  reviews: Review[]
  current: Review | null
}
```

- [ ] **Step 2: Criar `ReviewSection.tsx`**

```tsx
import { ReviewItem, CheckState } from '@/types/reviews'

const CHECK_DATA_ATTR: Record<CheckState, string | undefined> = {
  filled: 'true',
  failed: 'failed',
  neutral: 'neutral',
  empty: undefined,
}

interface Props {
  title: string
  kicker: string
  items: ReviewItem[]
  onAdd?: () => void
  onToggle?: (index: number, currentState: CheckState | undefined) => void
}

export default function ReviewSection({ title, kicker, items, onAdd, onToggle }: Props) {
  return (
    <div className="card" style={{ padding: 22 }}>
      <div style={{ marginBottom: 14 }}>
        <div className="kicker">{kicker}</div>
        <h3 className="h-3" style={{ marginTop: 4 }}>{title}</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.length === 0 && (
          <div style={{ color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic' }}>Nada anotado.</div>
        )}
        {items.map((item, i) => {
          const state = item.state ?? 'empty'
          const attr = CHECK_DATA_ATTR[state]
          return (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div
                className="check"
                data-checked={attr}
                onClick={() => onToggle?.(i, item.state)}
                style={{ cursor: onToggle ? 'pointer' : 'default', flex: 'none', marginTop: 2 }}
              />
              <span style={{ fontSize: 13.5, color: state === 'empty' ? 'var(--text-3)' : 'var(--text-2)' }}>
                {item.text}
              </span>
            </div>
          )
        })}
      </div>

      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 14 }}
        >
          + Adicionar item
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Criar `Reviews/Index.tsx`**

```tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import { Icons } from '@/Components/Icons'
import { ReviewsPageProps, Review, CheckState, ReviewContent } from '@/types/reviews'
import ReviewSection from './components/ReviewSection'

const STATE_CYCLE: Record<string, CheckState> = {
  empty: 'filled',
  filled: 'failed',
  failed: 'neutral',
  neutral: 'empty',
}

export default function ReviewsIndex({ reviews, current }: ReviewsPageProps) {
  const [selected, setSelected] = useState<Review>(current ?? reviews[0])

  if (!selected) {
    return (
      <AppLayout title="Revisão" eyebrow="Cadência" subtitle="Nenhuma revisão registrada.">
        <div className="card" style={{ padding: 32, textAlign: 'center', fontStyle: 'italic', color: 'var(--text-4)' }}>
          Nenhuma revisão ainda. Comece a próxima semana.
        </div>
      </AppLayout>
    )
  }

  function patchContent(section: keyof ReviewContent, items: typeof selected.content.funcionou_bem) {
    const next = { ...selected.content, [section]: items }
    router.patch(`/reviews/${selected.id}`, {
      type:         selected.type,
      period_start: selected.period_start_iso,
      period_end:   selected.period_start_iso,
      content:      next,
    }, { preserveScroll: true })
  }

  function toggleItem(section: keyof ReviewContent, index: number) {
    const current = selected.content[section]
    const item = current[index]
    const nextState = STATE_CYCLE[item.state ?? 'empty']
    const updated = [...current]
    updated[index] = { ...item, state: nextState }
    patchContent(section, updated)
  }

  function addItem(section: keyof ReviewContent) {
    const text = prompt('Item:')
    if (!text?.trim()) return
    const updated = [...selected.content[section], { text: text.trim(), state: 'empty' as CheckState }]
    patchContent(section, updated)
  }

  return (
    <AppLayout
      title="Revisão"
      eyebrow="Cadência"
      subtitle="Revisão semanal: o que aconteceu, o que aprender, o que ajustar."
      actions={
        <select
          value={selected.id}
          onChange={(e) => {
            const id = Number(e.target.value)
            const found = reviews.find(r => r.id === id)
            if (found) setSelected(found)
          }}
          style={{ padding: '6px 10px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--text)', fontSize: 12.5 }}
        >
          {reviews.map(r => (
            <option key={r.id} value={r.id}>Semana {r.week_number} · {r.year}</option>
          ))}
        </select>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Hero */}
        <div className="card" style={{ padding: 32, background: 'linear-gradient(180deg, var(--green-wash) 0%, var(--surface) 100%)', borderColor: 'var(--green-soft)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="kicker">CADÊNCIA · SEMANAL</div>
              <h1 className="page-title" style={{ marginTop: 6 }}>
                Semana <em>{selected.week_number}</em> · {selected.year}
              </h1>
              <div className="mono muted" style={{ fontSize: 12, marginTop: 8 }}>
                {selected.period_start} → {selected.period_end}
              </div>
            </div>
            <div className="ring" style={{ ['--p' as string]: selected.completion_pct, ['--size' as string]: '96px', ['--ring-thickness' as string]: '10px' } as React.CSSProperties}>
              <span>{selected.completion_pct}%</span>
            </div>
          </div>
        </div>

        {/* Grid 2×2 de seções */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <ReviewSection
            kicker="FUNCIONOU BEM"
            title="O que rendeu"
            items={selected.content.funcionou_bem}
            onAdd={() => addItem('funcionou_bem')}
            onToggle={(i) => toggleItem('funcionou_bem', i)}
          />
          <ReviewSection
            kicker="PODE MELHORAR"
            title="Onde houve atrito"
            items={selected.content.pode_melhorar}
            onAdd={() => addItem('pode_melhorar')}
            onToggle={(i) => toggleItem('pode_melhorar', i)}
          />
          <ReviewSection
            kicker="APRENDIZADOS"
            title="O que ficou na bagagem"
            items={selected.content.aprendizados}
            onAdd={() => addItem('aprendizados')}
          />
          <ReviewSection
            kicker="PRÓXIMA SEMANA"
            title="O que perseguir"
            items={selected.content.proxima_semana}
            onAdd={() => addItem('proxima_semana')}
            onToggle={(i) => toggleItem('proxima_semana', i)}
          />
        </div>

        {/* Footer: tabela de cadência (placeholder estático) */}
        <div className="card" style={{ padding: 20 }}>
          <div className="card-head" style={{ marginBottom: 12 }}>
            <div className="card-title">Outras cadências</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, fontSize: 12.5 }}>
            {[
              { label: 'Diária',     status: 'em pausa', tag: 'tag-gold' },
              { label: 'Mensal',     status: 'próxima',  tag: 'tag-sky'  },
              { label: 'Trimestral', status: 'aberto',   tag: 'tag-green'},
              { label: 'Anual',      status: '—',        tag: 'tag'      },
            ].map((row, i) => (
              <div key={i} style={{ paddingTop: 10, borderTop: '1px solid var(--line-soft)' }}>
                <div className="kicker">{row.label.toUpperCase()}</div>
                <div style={{ marginTop: 6 }}>
                  <span className={`tag ${row.tag}`}><span className="dot" />{row.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
```

- [ ] **Step 4: Validar visualmente**

Em `https://vaultus.local/reviews`:
- Hero verde com "Semana XX · 2026" e Ring 96px no canto
- Grid 2×2 com 4 seções, cada uma com header e itens marcados por `.check` colorido
- Footer com 4 cadências
- Select no topo permite trocar entre as 3 reviews
- Clicar em `.check` cicla estado (empty → filled → failed → neutral → empty)
- "+ Adicionar item" prompts texto e adiciona à seção

- [ ] **Step 5: Commit**

```bash
git add src/resources/js/types/reviews.ts src/resources/js/Pages/Reviews/
git commit -m "feat(reviews): Index com hero, grid 2×2 de seções e cadência footer"
```

---

## Task 10: Revisão — Criar nova review (botão + endpoint)

**Files:**
- Modify: `src/resources/js/Pages/Reviews/Index.tsx`

A revisão de uma nova semana é criada manualmente. Adicionar botão "Nova revisão (esta semana)" ao Index.

- [ ] **Step 1: Adicionar botão e handler em `Reviews/Index.tsx`**

No JSX `actions={...}` do `<AppLayout>`, adicionar um botão **antes** do `<select>`:

Localize:

```tsx
actions={
  <select ...>
    ...
  </select>
}
```

Substitua por:

```tsx
actions={
  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
    <button className="btn btn-primary btn-sm" onClick={createCurrent}>
      <Icons.Plus size={13} /> Nova revisão
    </button>
    <select ...>
      ...
    </select>
  </div>
}
```

E acrescente o handler `createCurrent` ao componente, próximo aos demais handlers:

```tsx
function createCurrent() {
  const start = new Date()
  start.setDate(start.getDate() - start.getDay() + 1) // segunda
  const end = new Date(start)
  end.setDate(end.getDate() + 6) // domingo
  const iso = (d: Date) => d.toISOString().slice(0, 10)

  router.post('/reviews', {
    type: 'weekly',
    period_start: iso(start),
    period_end:   iso(end),
    content: {
      funcionou_bem: [],
      pode_melhorar: [],
      aprendizados: [],
      proxima_semana: [],
    },
  }, { preserveScroll: true })
}
```

Note: o backend (Task 8) já tem `store` validado para isso.

- [ ] **Step 2: Validar fluxo**

Se a semana atual já tem review (do seeder), clicar "Nova revisão" provavelmente vai criar uma duplicada — aceitável nesta fase (sem unique constraint no schema atual). Para evitar duplicação na vida real, o controller pode futuramente checar `firstOrCreate`.

Por enquanto, testar: clicar em "Nova revisão" cria uma nova entrada vazia, aparece no select.

- [ ] **Step 3: Commit**

```bash
git add src/resources/js/Pages/Reviews/Index.tsx
git commit -m "feat(reviews): botão Nova revisão cria semana corrente"
```

---

## Task 11: Cleanup — remover loop de stubs do `web.php`

**Files:**
- Modify: `src/routes/web.php`

Depois das tasks 1, 5 e 8, o loop `$stubs = [...]` deve estar vazio ou já removido. Confirmação final.

- [ ] **Step 1: Inspecionar `web.php`**

```bash
grep -n "stubs\|Stub/Index" src/routes/web.php
```

Se ainda houver código do tipo:

```php
$stubs = [];
foreach ($stubs as $module) {
    Route::get("/{$module}", fn() => Inertia::render('Stub/Index', ['module' => $module]))->name($module);
}
```

Remover essas linhas (incluindo a declaração `$stubs = []` se vazia). O arquivo `Pages/Stub/Index.tsx` continua existindo (pode ser usado no futuro para outros módulos), mas sem rotas apontando para ele dentro do grupo principal de routes da app.

- [ ] **Step 2: Verificar que as 3 telas continuam funcionando**

Acessar:
- `https://vaultus.local/notes`
- `https://vaultus.local/contacts`
- `https://vaultus.local/reviews`

Todas devem renderizar suas Index respectivas.

- [ ] **Step 3: Commit**

```bash
git add src/routes/web.php
git commit -m "chore(routes): remover loop residual de stubs"
```

---

## Self-Review

**1. Spec coverage da Fase 3** (versus `2026-05-27-design-system-editorial-design.md` §"Fase 3"):

| Spec | Coberto por |
|---|---|
| Notas: split layout (sidebar 320px + reader) | T2 |
| Notas: search no topo + agrupamento "Todas" | T2 (sem distinção "Fixadas" — schema atual não tem `is_pinned`) |
| Notas: `.accent-line` verde na nota ativa | T2 |
| Notas: eyebrow mono ("FIXADA · DESIGN · ATUALIZADO HOJE, 14:22") | T2 (formato adaptado: `CADERNO · ATUALIZADO data hh:mm`) |
| Notas: h-2 serifado + conteúdo em markdown + blockquote `.accent-line` + highlight `var(--green-soft)` | T2/T3 (markdown renderizado como `whiteSpace: pre-wrap` — não há parser markdown no projeto; manter texto simples por enquanto) |
| Contatos: split layout idêntico ao Notes | T6 |
| Contatos: sidebar agrupada por categoria com `<GradientAvatar />` | T6 |
| Contatos: avatar grande + nome serifado + chips email/tel + grid + timeline + PRÓXIMO `.accent-line` | T6 (chips com `Icons.Star` como placeholder visual; timeline de atividade NÃO implementada — schema não tem activities table) |
| Revisão: hero gradient + Ring 68% + número italic-verde | T9 |
| Revisão: grid 2×2 com `.check` colorido por estado | T9 |
| Revisão: footer com metas trimestrais (`.meter`) + tabela cadência | T9 (cadência tabela como placeholder estático; metas trimestrais NÃO implementadas — fora do schema atual) |

**Gaps intencionais** (documentados aqui):

- **Notas "Fixadas"**: schema `notes` não tem `is_pinned` boolean. Spec previa agrupamento, mas como não há campo, omitir. Adicionar via migration futura quando o usuário precisar.
- **Notas com markdown**: o projeto não tem markdown parser. Para esta fase, render `whiteSpace: pre-wrap` no `<NoteReader>` preserva quebras de linha, mas não negrito/itálico/links. Adicionar `marked` ou similar se o usuário quiser.
- **Contatos: chips de email/telefone**: usar `Icons.Star` como placeholder pictórico. Trocar para `Icons.Email`/`Icons.Phone` se existirem em `Icons.tsx` (verificar antes de implementar T6).
- **Contatos: timeline de atividade**: não há tabela `contact_activities`. Spec menciona, mas implementar seria uma extensão de schema fora do escopo Fase 3. Adiar.
- **Revisão: metas trimestrais com `.meter`**: tabela `goals` (do Finance) já tem deadline mas não há flag "quarterly". Adiar — a Review do tipo `'quarterly'` cobre objetivos via JSON content.

**2. Placeholder scan:** Conferido — todas as tasks têm código completo, sem TBD/TODO. Os textos em pt-BR são realistas. As datas usam `Carbon::now()` (dinâmicas) e seedings têm dados específicos.

**3. Type consistency:**
- `Notebook { id, name, color }` consistente entre PHP e TS
- `Note` props: `id, notebook_id, notebook_name, notebook_color, title, content, is_sensitive, tags[], updated_at, updated_at_relative` — consistente
- `Contact` props: `id, name, initials, email, phone, photo, birthday, context, next_step, last_contacted_at, last_contacted_relative, remind_after_days, notes, upcoming_birthday` — consistente
- `Review` props: `id, type, period_start, period_start_iso, period_end, week_number, year, completion_pct, content{4 chaves}` — consistente
- `CheckState` (`'filled' | 'failed' | 'neutral' | 'empty'`) ↔ `data-checked` attribute (`'true' | 'failed' | 'neutral' | undefined`) — mapeamento documentado em `ReviewSection.tsx`

**Tipo Icons.Email / Icons.Phone:** verificar em T6 antes de prosseguir; se não existirem, manter `Icons.Star` como ícone genérico de chip ou criar SVG inline minimalista.

---

## Não-objetivos

- Não implementar busca full-text de Notas (filtro client-side por título/conteúdo é suficiente)
- Não implementar markdown rendering em notas (fora de escopo)
- Não implementar timeline de atividade em contatos (sem schema)
- Não implementar `is_pinned` em notas (sem schema)
- Não implementar metas trimestrais com `.meter` na Review (sem schema unificado de goals→reviews)
- Não implementar exportação/import de notas ou contatos
- Não implementar reviews `'monthly'`/`'quarterly'`/`'annual'` no frontend (backend aceita, frontend trata só `'weekly'`)
- Não pixel-perfect contra o PDF original

---

## Ordem de execução

**Sequencial obrigatório por dependências:**

1. **T1** Notas backend → **T2** Notas Index → **T3** Notas CRUD
2. **T4** Contatos migration → **T5** Contatos backend → **T6** Contatos Index → **T7** Contatos CRUD
3. **T8** Reviews backend → **T9** Reviews Index → **T10** Reviews criar
4. **T11** Cleanup web.php (último)

Cada grupo (Notas/Contatos/Reviews) é independente dos outros — podem ser executados em qualquer ordem, mas as tasks dentro de um grupo precisam ser sequenciais.

**Critério de "pronto":** as 3 telas em `https://vaultus.local/notes`, `/contacts`, `/reviews` renderizam com dados reais do seeder, CRUD funciona (criar/editar/deletar via modal), tema dark+light testado, sem erros TS.

Após T11, sugerir transição para **manutenção/refinamento contínuo** — não há Fase 4 planejada na spec original.
