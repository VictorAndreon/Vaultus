# Vaultus Phase 3 — Diário Pessoal

**Data:** 2026-05-10
**Escopo:** Módulo de diário com editor de texto rico (Tiptap), prompts customizáveis, navegação calendário + lista, integração com métricas de saúde da Fase 2.

---

## 1. Decisões de Design

| Decisão | Escolha | Motivo |
|---|---|---|
| Arquitetura de UI | Editor inline na mesma página | Sem rotas extras; auto-save via debounce; padrão validado na Fase 2 |
| Editor de texto | Tiptap | Biblioteca React moderna, TypeScript nativo, extensível |
| Navegação | Calendário + lista | Dupla visão: lacunas visíveis no calendário, preview rápido na lista |
| Prompts | Cards colapsáveis acima do editor | Guia visual não-intrusivo, gerenciado por modal |
| Streak | Sem streak | Complexidade não justificada para diário pessoal |
| Exportação | Não implementada nesta fase | YAGNI — implementar quando surgir necessidade real |
| Criptografia | `EncryptedCast` no campo `content` | Já implementado na Fase 0; diário é conteúdo sensível |

---

## 2. Banco de Dados

Nenhuma migration nova. As três tabelas já existem da Fase 0.

### `journal_entries`
| Coluna | Tipo | Notas |
|---|---|---|
| `user_id` | `bigint` | FK → users |
| `date` | `date` | Unique com `user_id` |
| `content` | `text` | Criptografado via `EncryptedCast` |
| `tags` | `jsonb` | Array de strings |
| `health_metric_id` | `bigint` nullable | FK → health_metrics, SET NULL on delete |

### `journal_prompts`
| Coluna | Tipo | Notas |
|---|---|---|
| `user_id` | `bigint` | FK → users |
| `content` | `string` | Texto do prompt |
| `is_active` | `boolean` | Default true |
| `position` | `integer` | Ordem de exibição, default 0 |

---

## 3. Models

### `JournalEntry` — `app/Domains/Journal/Models/JournalEntry.php`
- `fillable`: `user_id`, `date`, `content`, `tags`, `health_metric_id`
- Casts: `date → date`, `tags → array`, `content → EncryptedCast`
- Relações: `belongsTo(User)`, `belongsTo(HealthMetric)` (nullable)
- Scope `forDate(string $date)`: filtra por data exata

### `JournalPrompt` — `app/Domains/Journal/Models/JournalPrompt.php`
- `fillable`: `user_id`, `content`, `is_active`, `position`
- Casts: `is_active → boolean`, `position → integer`
- Relação: `belongsTo(User)`
- Scope `active()`: filtra `is_active = true`, ordena por `position`

---

## 4. Controllers e Rotas

### `JournalEntryController` — `app/Domains/Journal/Controllers/JournalEntryController.php`

| Método | Rota | Descrição |
|---|---|---|
| `index` | `GET /journal` | Renderiza `Journal/Index` com props |
| `store` | `POST /journal` | Cria entrada para uma data |
| `update` | `PATCH /journal/{entry}` | Atualiza conteúdo (auto-save) |

**Props do `index`:**
```php
[
    'entries' => JournalEntryResource::collection(
        $user->journalEntries()->with('healthMetric')->latest('date')->limit(90)->get()
    ),
    'prompts' => JournalPromptResource::collection(
        $user->journalPrompts()->active()->get()
    ),
    'today'   => now()->tz($user->timezone)->toDateString(),
]
```

### `JournalPromptController` — `app/Domains/Journal/Controllers/JournalPromptController.php`

| Método | Rota | Descrição |
|---|---|---|
| `store` | `POST /journal/prompts` | Cria prompt |
| `update` | `PATCH /journal/prompts/{prompt}` | Edita texto ou reordena |
| `destroy` | `DELETE /journal/prompts/{prompt}` | Remove prompt |

### Ordem das Rotas em `web.php`

```php
Route::get('/journal', [JournalEntryController::class, 'index'])->name('journal');
Route::post('/journal', [JournalEntryController::class, 'store']);
Route::post('/journal/prompts', [JournalPromptController::class, 'store']);   // ANTES de {entry}
Route::patch('/journal/prompts/{prompt}', [JournalPromptController::class, 'update']);
Route::delete('/journal/prompts/{prompt}', [JournalPromptController::class, 'destroy']);
Route::patch('/journal/{entry}', [JournalEntryController::class, 'update']);
```

### Autorização
`abort_if($entry->user_id !== auth()->id(), 403)` em todos os métodos com `{entry}` ou `{prompt}`. Sistema single-user — sem Policy formal nesta fase.

---

## 5. Resources

### `JournalEntryResource`
```php
[
    'id'               => $this->id,
    'date'             => $this->date->toDateString(),
    'content'          => $this->content,
    'tags'             => $this->tags ?? [],
    'health_metric_id' => $this->health_metric_id,
    'mood'             => $this->whenLoaded('healthMetric', fn() => $this->healthMetric?->mood),
    'energy'           => $this->whenLoaded('healthMetric', fn() => $this->healthMetric?->energy),
    'preview'          => $this->content ? mb_substr(strip_tags($this->content), 0, 100) : null,
]
```

### `JournalPromptResource`
```php
[
    'id'        => $this->id,
    'content'   => $this->content,
    'is_active' => $this->is_active,
    'position'  => $this->position,
]
```

---

## 6. Frontend

### Estrutura de Arquivos
```
resources/js/Pages/Journal/
├── Index.tsx
└── components/
    ├── JournalCalendar.tsx
    ├── EntryList.tsx
    ├── EntryEditor.tsx
    ├── PromptsPanel.tsx
    └── PromptManager.tsx
```

### `Index.tsx`
- Recebe `entries`, `prompts`, `today`
- Estado local: `selectedDate: string | null`
- Quando `selectedDate` está definido: renderiza `PromptsPanel` + `EntryEditor`
- Quando `selectedDate` é null: renderiza `JournalCalendar` + `EntryList`
- Botão "Escrever hoje" define `selectedDate = today`

### `JournalCalendar.tsx`
- Calendário mensal compacto sem biblioteca externa (lógica via `Date` nativo)
- Dias com entrada: ponto indigo abaixo do número
- Clicar num dia: define `selectedDate`
- Navegação mês anterior/próximo via estado local `currentMonth`
- Mês atual destacado com borda

### `EntryList.tsx`
- Lista cronológica reversa das entradas
- Cada item: data formatada, preview (~100 chars stripped de HTML), tags como badges
- Clicar: define `selectedDate`
- Estado vazio: "Nenhuma entrada ainda. Comece escrevendo hoje."

### `EntryEditor.tsx`
- Editor Tiptap com extensões: `Bold`, `Italic`, `BulletList`, `OrderedList`, `Heading` (H2/H3)
- Toolbar mínima: botões para cada extensão ativa
- Auto-save: `useEffect` com `useRef` para o timeout — 800ms de debounce após última tecla
  - Se `entry.id` existe: `router.patch('/journal/{id}', { content })`
  - Se não existe: `router.post('/journal', { date: selectedDate, content })`
  - Ambos com `preserveScroll: true, preserveState: true`
- Indicador de status: "Salvando…" durante o request, "Salvo" após sucesso
- Se `mood` ou `energy` do dia estão presentes: banner discreto acima do editor — "Humor: 😊 · Energia: ⚡ registrados neste dia"
- Botão "← Voltar" limpa `selectedDate`

### `PromptsPanel.tsx`
- Cards colapsáveis com os prompts ativos
- Botão de engrenagem (⚙) abre `PromptManager`
- Colapsado por padrão se não há prompts

### `PromptManager.tsx`
- Modal simples
- Lista prompts com input inline para editar `content`
- Reordenação via botões ↑↓ (atualiza `position`)
- Botão "+ Novo prompt" adiciona via `router.post`
- Botão × remove via `router.delete`
- Todas as ações com `preserveScroll: true`

---

## 7. Integração com Dashboard

`DashboardAggregator::getStats()` ganha:
```php
'journal_entries_this_month' => $user->journalEntries()
    ->whereMonth('date', now($user->timezone)->month)
    ->whereYear('date', now($user->timezone)->year)
    ->count(),
```

`QuickStats.tsx` exibe esse número no card de "Diário" (substituindo o `journal_streak: 0` atual).

`User` model ganha relações:
```php
public function journalEntries() { return $this->hasMany(JournalEntry::class); }
public function journalPrompts() { return $this->hasMany(JournalPrompt::class); }
```

---

## 8. Tipos TypeScript

Adicionar em `resources/js/types/index.d.ts`:

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

---

## 9. Testes

### `tests/Feature/Journal/JournalEntryTest.php`
- Página `/journal` requer autenticação
- Página renderiza com props `entries`, `prompts`, `today`
- Criar entrada para uma data
- Atualizar entrada existente
- Não pode modificar entrada de outro usuário (403)
- Criar duas entradas para a mesma data retorna erro (unique constraint)

### `tests/Feature/Journal/JournalPromptTest.php`
- Criar prompt
- Editar prompt
- Reordenar (atualizar `position`)
- Deletar prompt
- Não pode modificar prompt de outro usuário (403)

---

## 10. Mapa de Arquivos

### Criar
- `src/app/Domains/Journal/Models/JournalEntry.php`
- `src/app/Domains/Journal/Models/JournalPrompt.php`
- `src/database/factories/JournalEntryFactory.php`
- `src/database/factories/JournalPromptFactory.php`
- `src/app/Domains/Journal/Controllers/JournalEntryController.php`
- `src/app/Domains/Journal/Controllers/JournalPromptController.php`
- `src/app/Http/Resources/JournalEntryResource.php`
- `src/app/Http/Resources/JournalPromptResource.php`
- `src/resources/js/Pages/Journal/Index.tsx`
- `src/resources/js/Pages/Journal/components/JournalCalendar.tsx`
- `src/resources/js/Pages/Journal/components/EntryList.tsx`
- `src/resources/js/Pages/Journal/components/EntryEditor.tsx`
- `src/resources/js/Pages/Journal/components/PromptsPanel.tsx`
- `src/resources/js/Pages/Journal/components/PromptManager.tsx`
- `src/tests/Feature/Journal/JournalEntryTest.php`
- `src/tests/Feature/Journal/JournalPromptTest.php`

### Modificar
- `src/routes/web.php` — adicionar 6 rotas, remover `journal` dos stubs
- `src/app/Domains/Auth/Models/User.php` — adicionar `journalEntries()` e `journalPrompts()`
- `src/app/Domains/Dashboard/Services/DashboardAggregator.php` — substituir `journal_streak: 0` por `journal_entries_this_month`
- `src/resources/js/Pages/Dashboard/Index.tsx` — atualizar tipo da prop `stats` (`journal_entries_this_month` no lugar de `journal_streak`)
- `src/resources/js/Pages/Dashboard/widgets/QuickStats.tsx` — exibir contagem do mês no lugar do streak
- `src/resources/js/types/index.d.ts` — adicionar `JournalEntry`, `JournalPrompt`
