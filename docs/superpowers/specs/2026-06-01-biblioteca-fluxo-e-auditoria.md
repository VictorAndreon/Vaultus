# Biblioteca (Domínio de Leitura) — Documentação de Fluxo & Auditoria

> Data: 2026-06-01 · Escopo: domínio `Library` (livros / leitura)
> Status atual: **funcional, porém incompleto** (sem edição, sem responsividade, dados decorativos).

---

## 1. Arquitetura do domínio

| Camada | Arquivo |
|---|---|
| Rotas | `src/routes/web.php` → `GET /library` (`library`), `POST /library` |
| Controller | `src/app/Domains/Library/Controllers/LibraryController.php` |
| Model | `src/app/Domains/Library/Models/LibraryItem.php` |
| Migration | `src/database/migrations/2026_05_07_000030_create_library_items_table.php` |
| Página | `src/resources/js/Pages/Library/Index.tsx` |
| Modal de criação | `src/resources/js/Pages/Library/components/LibraryModal.tsx` |
| Widget no Dashboard | `DashboardAggregator::getReading()` + `Dashboard/Index.tsx` (top 3 "Em leitura") |
| Navegação | `Sidebar.tsx` (`/library`, "Biblioteca") · `Topbar.tsx` (título) |
| Testes | `src/tests/Feature/Library/LibraryTest.php` (3 testes, todos passam) |

### Modelo de dados (`library_items`)
Tabela **polimórfica por `type`**, mas **apenas `type='book'` é usado**.

`id, user_id, type, title, status, rating, notes, genre, cover_url, author, total_pages, current_page, platform, season_count, started_at, finished_at, timestamps, softDeletes`

- **Status possíveis:** `reading` · `queue` · `done`.
- `progress_percent` é atributo calculado: `min(100, round(current_page / total_pages * 100))`.
- Usa `SoftDeletes` no model — mas **nunca é acionado** (não há rota de exclusão).

---

## 2. Fluxo do usuário (estado atual)

```
┌─────────────────┐     clique "Adicionar livro"      ┌──────────────────┐
│  /library       │ ────────────────────────────────► │  LibraryModal     │
│  (index)        │                                    │  (criação)        │
│                 │ ◄──────────────────────────────── │  POST /library    │
│  4 stats        │     onSuccess → fecha + redirect   └──────────────────┘
│  Em leitura     │
│  Concluídos(8)  │   ✗ sem edição   ✗ sem exclusão   ✗ sem "ver todos"
│  Fila (10)      │   ✗ sem atualizar progresso       ✗ sem mudar status
└─────────────────┘
```

### Criação (único fluxo de escrita existente)
1. Botão **"Adicionar livro"** abre `LibraryModal`.
2. Campos: título* · autor · gênero · status · capa (URL) · total de páginas · página atual (só `reading`) · início (`reading`/`done`) · conclusão (`done`) · avaliação 1–5 (`done`).
3. `router.post('/library', payload)` → `LibraryController::store` valida e cria com `type='book'`.
4. `onSuccess` fecha o modal; o controller redireciona com flash `success`.

---

## 3. Resultado da validação (respostas diretas)

### ✅ "As funções estão funcionando corretamente?"
- `index` e `store` funcionam; os 3 testes de feature passam (`php artisan test --filter=LibraryTest`).
- ⚠️ **`store` não tem teste** — o único fluxo de escrita não é coberto.

### ⚠️ "Há componentes órfãos?"
Nenhum **componente React** órfão. Porém há **dados/campos órfãos**:

| Item | Situação |
|---|---|
| `genre` | Coletado no modal e salvo no banco, mas **nunca exibido** em lugar nenhum. |
| `notes` | Coluna existe, **sem uso** (nem form, nem exibição). |
| `platform`, `season_count`, `type≠book` | Colunas mortas (design multimídia nunca implementado). |
| `cover_url` no Dashboard | `getReading()` busca `cover_url`, mas o Dashboard renderiza placeholder `ph` e **ignora**. |
| `cover_url` em Concluídos/Fila | O controller **nem seleciona** `cover_url` nesses mapeamentos. |

### ❌ "As imagens estão sendo renderizadas?"
- **Só em "Em leitura"** (`Index.tsx:84`) a capa real é renderizada.
- **"Concluídos"** usa placeholder `ph` fixo (`Index.tsx:120`) — nunca a capa real.
- **"Fila"** não exibe capa alguma.
- **Dashboard "Em leitura"** usa `ph` (ignora a `cover_url` que buscou).
- O único `<img>` **não tem `alt`, `loading="lazy"` nem `onError`** → ícone de imagem quebrada se a URL falhar.

### ❌ "É possível editar livros já lidos / em andamento?"
**Não.** Não existe rota nem UI de `update`/`destroy`. Consequências:
- Livro é **imutável após a criação**.
- **Não dá para atualizar o progresso** (`current_page`) conforme se lê → a barra fica congelada no valor inicial.
- **Não dá para mover entre status** (fila → lendo → concluído).
- **Não dá para excluir** (soft-delete existe no model, mas nunca é chamado).

### ⚠️ "As listagens de todos os status estão coerentes?"
- `reading`: sem limite. `queue`: limite 10. `done_recent`: limite 8. **Sem "ver todos"/paginação/arquivo** → impossível navegar o histórico completo de lidos.
- **Bug de coerência:** um livro `done` com `finished_at = NULL`:
  - aparece **no topo** de "Concluídos recentes" (Postgres ordena `NULLS FIRST` em `DESC`),
  - mas **não é contado** em "Livros 2026" nem em "Páginas no ano" (ambos usam `whereYear(finished_at, …)`).
  - → a lista e o contador **se contradizem**.
- `finished_at` e `rating` são opcionais para `done` → permite registros "concluídos" incompletos.

### ⚠️ "É possível visualizar tudo de forma agradável?"
- **Desktop:** sim — layout editorial limpo (stats, `meter`, estrelas, placeholders hachurados).
- **Mobile:** **não há nenhum breakpoint** — `@media` count = 0 em `app.css`. `g-4`/`g-3`/`g-12-5` ficam fixos → 4 colunas de stats + 3 de livros espremidas no celular.
- **i18n:** datas usam `Carbon::format('M Y')` → meses **em inglês** ("Jun 2026") num app pt-BR (confirmado via tinker; `translatedFormat` daria "jun 2026"). A fila mostra só o mês (`format('M')`), sem ano/dia → ambíguo.
- **Sparklines com dados fabricados:** arrays hardcoded (`[1,2,3,3,4,5,…]`), só o último ponto é real → **tendência enganosa**.
- **Modal:** sem exibição de erros de validação (submit inválido não dá feedback), sem fechar com `Esc`, sem focus-trap, sem `role="dialog"`/`aria-modal`.

---

## 4. Backlog priorizado de correções

### P0 — Funcionalidade essencial ausente
1. **Editar livro** (`PATCH /library/{id}` + modal de edição reaproveitando `LibraryModal`).
2. **Atualizar progresso** de leitura (`current_page`) sem reescrever o item.
3. **Mudar de status** (fila→lendo→concluído) e **excluir** (`DELETE`, usar o soft-delete).
4. **Teste de `store`** (e dos novos endpoints).

### P1 — Coerência de dados
5. Exigir `finished_at` quando `status=done` (ou contar por `updated_at` como fallback) para alinhar lista × contadores.
6. Validar `current_page ≤ total_pages` e `finished_at ≥ started_at`.
7. Exibir capa real em **Concluídos** e **Fila** (selecionar `cover_url` no controller) e no Dashboard.

### P2 — UX / apresentação
8. Adicionar `@media` (breakpoints) para os grids `g-4`/`g-3`/`g-12-5`.
9. Trocar `format()` por `->locale('pt_BR')->translatedFormat()` nas datas.
10. `<img>` com `alt`, `loading="lazy"` e fallback `onError`.
11. Substituir sparklines fabricados por série real (ex.: livros/páginas por mês) ou removê-los.
12. Exibir `genre` (ou remover o campo do modal); decidir o destino de `notes`/colunas multimídia.
13. Acessibilidade do modal: `Esc`, focus-trap, `role="dialog"`, exibição de `errors` do Inertia.

---

## 5. Referências de código (file:line)

- Capa só em "Em leitura": `Index.tsx:84-88`
- Placeholder fixo em Concluídos: `Index.tsx:120`
- Sparklines fabricados: `Index.tsx:58-61`
- Datas em inglês (controller): `LibraryController.php:30,46,61`
- `done` sem `finished_at` some das stats: `LibraryController.php:66-70`
- Sem rotas update/destroy: `web.php:140-141`
- `cover_url` buscado e ignorado no Dashboard: `DashboardAggregator.php:218` + `Dashboard/Index.tsx:392`
- Zero `@media`: `src/resources/css/app.css` (0 ocorrências)
