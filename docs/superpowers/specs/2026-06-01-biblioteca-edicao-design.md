# Biblioteca — Edição de itens (modal) & status "abandonado" — Design

> Data: 2026-06-01 · Domínio: `Library` · Tipo: feature
> Origem: validação em `docs/superpowers/specs/2026-06-01-biblioteca-fluxo-e-auditoria.md`
> Decisões do usuário: (1) acompanhamento via **modal de edição** (sem controle inline/log de sessões); (2) **adicionar status "abandonado"**.

## Problema

Hoje a Biblioteca é *append-only*: existem só `GET /library` e `POST /library`. Não há como atualizar progresso, corrigir campos, mudar status ou excluir um livro depois de criado. É o **único domínio do app sem `update`/`destroy`** — todos os outros (Hábitos, Notas, Finanças, Projetos, Contatos, Reviews) já editam reaproveitando o modal de criação com `isEdit ? patch : post`.

## Objetivo

Permitir editar e excluir qualquer item da Biblioteca pelo **mesmo gesto, em todos os status**, adotando as convenções já existentes no app, e introduzir o status **abandonado**. Sem inventar UX nova.

## Não-objetivos (backlog separado, no doc de auditoria)

Controle inline "bump de página", log de sessões de leitura, responsividade mobile, datas em pt-BR (`translatedFormat`), sparklines com dados reais, exibição de capas em Concluídos/Fila. Nada disso entra aqui.

---

## Arquitetura

### 1. Backend — `LibraryController`

Adicionar dois métodos, espelhando `HabitController::update/destroy` (route-model binding + checagem de posse):

```php
public function update(Request $request, LibraryItem $libraryItem): RedirectResponse
{
    abort_if($libraryItem->user_id !== $request->user()->id, 403);
    $validated = $this->validatedData($request);
    $libraryItem->update($validated);
    return redirect()->route('library')->with('success', 'Livro atualizado.');
}

public function destroy(Request $request, LibraryItem $libraryItem): RedirectResponse
{
    abort_if($libraryItem->user_id !== $request->user()->id, 403);
    $libraryItem->delete(); // SoftDeletes já no model
    return redirect()->route('library')->with('success', 'Livro removido.');
}
```

`validatedData()` é estendido:
- `status` passa a aceitar `in:reading,done,queue,abandoned`.
- Nova regra: `current_page` não pode exceder `total_pages` (regra cruzada — validar no controller: se ambos presentes e `current_page > total_pages`, erro em `current_page`).
- Ao salvar com `status=done` e `finished_at` vazio, preencher `finished_at = today()` antes do `update`/`create` (garante contagem nas estatísticas do ano). Aplicar também no `store`.

### 2. Rotas — `web.php` (bloco autenticado, junto da rota atual de library)

```php
Route::patch('/library/{libraryItem}', [LibraryController::class, 'update']);
Route::delete('/library/{libraryItem}', [LibraryController::class, 'destroy']);
```

### 3. Controller `index` — expor dados para edição + seção "abandonados"

Cada item mapeado para o front precisa do `id` (já tem) **e dos campos editáveis** que hoje não são enviados (`genre`, `cover_url`, `total_pages`, `current_page`, `rating`, `started_at`, `finished_at`, `status`) — caso contrário o modal de edição abre com campos vazios. Para evitar repetição, `index` envia, em cada item das listas, o objeto completo necessário ao modal (datas em formato ISO `Y-m-d` para preencher `<input type="date">`, separado do rótulo `M Y` usado na exibição).

Nova consulta `abandoned` (espelha `queue`), ordenada por `updated_at desc`, expondo `title`, `author`, `current_page`, `total_pages`, `progress_percent`.

### 4. Frontend — `LibraryModal` vira create+edit

Seguindo o padrão `WishlistModal`:
- Prop nova: `item?: LibraryItemFull | null`. `const isEdit = !!item`.
- `const errors = usePage().props.errors as Record<string,string> | undefined` — **exibir os erros** abaixo dos campos relevantes (hoje são engolidos).
- Estados inicializados a partir de `item?.campo ?? ''`.
- Título/legenda: `isEdit ? 'Editar livro' : 'Adicionar livro'`.
- Dropdown de status ganha 4ª opção: `<option value="abandoned">Abandonado</option>`.
- Submit: `isEdit ? router.patch('/library/'+item.id, payload, opts) : router.post('/library', payload, opts)`.
- Modo edição mostra botão **"Excluir"** (à esquerda do rodapé), com `useConfirm` de `@/Components/dialogs/DialogProvider`:
  ```ts
  const confirm = useConfirm()
  async function onDelete() {
    if (await confirm({ title: 'Remover livro?', message: title })) {
      router.delete('/library/'+item!.id, { preserveScroll: true, onSuccess: onClose })
    }
  }
  ```

### 5. Frontend — `Library/Index.tsx`

- Estado do modal passa a guardar o item em edição: `const [editing, setEditing] = useState<LibraryItemFull | null | undefined>(undefined)` — `undefined` = fechado, `null` = criar, objeto = editar.
- "Adicionar livro" → `setEditing(null)`. Cada card/linha (Em leitura, Concluídos, Fila, Abandonados) recebe `onClick={() => setEditing(b)}` + `cursor: pointer`.
- Render: `{editing !== undefined && <LibraryModal item={editing} onClose={() => setEditing(undefined)} />}`.
- Nova seção **"Abandonados"** (largura total, abaixo de Concluídos/Fila): lista enxuta no estilo da fila, mostrando título · autor · `parou na pág {current_page} ({progress_percent}%)`. Aparece só se houver itens.

---

## Fluxo de dados

```
Clique no livro (qualquer status) → setEditing(item)
        → LibraryModal pré-preenchido (isEdit)
        → editar campos / trocar status / Excluir
        → router.patch|delete  → controller (posse + validação)
        → redirect 'library'   → Inertia recarrega props → listas atualizam
Erro de validação → props.errors → modal permanece aberto exibindo a mensagem
```

## Tratamento de erros

- Posse: `abort_if(..., 403)` no update/destroy.
- Validação: regras do `validatedData` + regra cruzada `current_page ≤ total_pages`; erros exibidos no modal via `props.errors`.
- Item inexistente: route-model binding → 404.

## Status (modelo de dados)

Coluna `status` é `string(15)` — comporta `abandoned` sem migration. Valores: `reading | queue | done | abandoned`. `abandoned` é excluído de todos os contadores de `done` (estatísticas de ano já filtram `status=done`) e do "Em curso" (conta só `reading`).

## Plano de testes (Feature, `LibraryTest`)

1. `store` cria livro (teste hoje ausente).
2. `store`/`update` com `status=done` sem `finished_at` → grava `finished_at = hoje`.
3. `update` altera campos do próprio livro (ex.: `current_page`, `status` queue→reading).
4. `update`/`destroy` em livro de **outro usuário** → 403.
5. `update` com `current_page > total_pages` → erro de validação (422/redirect com erros).
6. `destroy` faz soft-delete (registro com `deleted_at`, some das listagens).
7. `index` retorna a lista `abandoned` quando há item abandonado.

## Arquivos afetados

- `src/app/Domains/Library/Controllers/LibraryController.php` (update, destroy, validação, index enriquecido, abandoned)
- `src/routes/web.php` (2 rotas)
- `src/resources/js/Pages/Library/components/LibraryModal.tsx` (create+edit, excluir, erros, status)
- `src/resources/js/Pages/Library/Index.tsx` (clique p/ editar, estado, seção abandonados)
- `src/tests/Feature/Library/LibraryTest.php` (novos testes)
