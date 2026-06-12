# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Vaultus é um app pessoal de gestão (finanças, hábitos, projetos, journal, notas, contatos, biblioteca, reviews) — monólito Laravel 11 + Inertia.js + React 19 + TypeScript, orquestrado via Docker.

## Ambiente e comandos

**Tudo roda em containers Docker. Nunca rode `php`, `composer`, `npm` ou `node` diretamente no host.** O código da aplicação está em `src/` (montado em `/var/www/html` no container `app`). Os comandos `docker compose` rodam a partir da raiz do repositório.

```bash
# Subir o stack
docker compose up -d db redis app          # núcleo (db/redis/app) — suficiente p/ testes
docker compose --profile dev up -d          # tudo, incluindo o container `node` (Vite)
docker compose --profile dev up node -d     # só o dev server do Vite (HMR em :5173)

# Testes (PHPUnit)
docker compose exec -T app php artisan test
docker compose exec -T app php artisan test tests/Feature/Reviews/ReviewsTimezoneTest.php   # um arquivo
docker compose exec -T app php artisan test --filter test_deposit_creates_transfer_pair      # um teste

# Build de produção e type-check do frontend (container efêmero `node`)
docker compose --profile dev run --rm node sh -c "npm run build"
docker compose --profile dev run --rm node sh -c "npx tsc --noEmit -p tsconfig.json --ignoreDeprecations 6.0"

# Artisan em geral (precisa do container `app` de pé)
docker compose exec -T app php artisan route:list
docker compose exec -T app php artisan migrate
docker compose exec -T app php artisan tinker
```

App em `https://vaultus.local` (Caddy/TLS). Filas via Horizon (container `horizon`); o `scheduler` roda `schedule:run` em loop. O `horizon` entra em restart loop se `redis` não estiver de pé — não é bug de código.

**O build NÃO checa tipos.** `npm run build` é `vite build` (esbuild remove os tipos sem validar). Rode `tsc --noEmit` manualmente — e sempre com `--ignoreDeprecations 6.0`, pois o `tsconfig.json` usa `baseUrl`, deprecado no TS 6.

## Arquitetura

**Domain-Driven, não a estrutura padrão do Laravel.** Quase todo o backend vive em `src/app/Domains/{Domínio}/` com subpastas `Controllers/`, `Models/`, `Services/`, `Observers/`, `Queries/`. O PSR-4 é só `App\ → app/`, então `App\Domains\Finance\Models\Account` ↔ `app/Domains/Finance/Models/Account.php`. Não há provider que auto-registre rotas/recursos por domínio.

**Rotas:** `routes/web.php` é a fonte única das rotas do app — todas declaradas explicitamente, importando controllers dos domínios. `routes/api.php` existe apenas para auth via token (Sanctum), não para o app. Cuidado com **ordem de rotas**: caminhos estáticos devem vir antes de `{param}` (ex.: `/habits/health-metrics` antes de `/habits/{habit}`) — há comentários no arquivo marcando isso.

**Fluxo de página (Inertia, sem API REST):** controllers retornam `Inertia::render('Domínio/Pagina', [...props])`. O `app.tsx` resolve o nome para `resources/js/Pages/{Domínio}/{Pagina}.tsx` via `import.meta.glob`. Alias `@/*` → `resources/js/*`. Páginas usam o `AppLayout`; o `DialogProvider` (confirm/prompt) envolve tudo na raiz do `app.tsx` (não no layout). Componentes reutilizáveis em `resources/js/Components/`, helpers em `resources/js/lib/`.

**Props compartilhadas** (em toda página, via `HandleInertiaRequests::share`): `auth.user` (inclui `timezone` e `two_factor_confirmed_at`) e `flash` (`success`/`error`). O `timezone` do usuário fica disponível no frontend e é usado em lógica de datas.

**Auth:** sessão + 2FA (TOTP). O model de usuário canônico é `App\Domains\Auth\Models\User` (ver `config/auth.php`). ⚠️ Existe também `app/Models/User.php`, mas ele **não** é o model de autenticação — não o use.

### Mapa de domínios e funcionalidades

Todos os dados são por usuário (`user_id`). Frontend espelha em `resources/js/Pages/{Domínio}/`.

- **Dashboard** — agregador (só `Controllers/` + `Services/`, sem models próprios); consome dados dos outros domínios.
- **Finance** — o mais complexo (ver seção abaixo): contas, transações, metas, wishlist, orçamento por categoria, pagamentos futuros, recorrências, parcelamentos, relatórios/CSV, faturas de cartão.
- **Habits** — hábitos com check-ins diários + métricas de saúde (`HealthMetric`). A lógica de adesão/frequência vive no model `Habit` (`isExpectedOn`, `adherenceInRange`) e é sensível a timezone.
- **Journal** — entradas de diário + prompts configuráveis (`JournalPrompt`).
- **Projects** — kanban por projeto (`ProjectColumn`/`ProjectTask` com `move`/`triage`), notas e links de projeto, e **Wants** (lista de desejos/ideias promovível a projeto via `POST /wants/{want}/promote`).
- **Tasks** — ⚠️ domínio **sem models próprios**: é uma visão agregada de `ProjectTask` (do domínio Projects) com inbox, captura rápida (`POST /tasks/capture`) e triagem. Mudanças em tarefas geralmente tocam o domínio Projects.
- **Library** — itens de leitura/mídia com progresso (accessor `progress_percent`) e capas com upload (servidas via `GET /library/{item}/cover`).
- **Notes** — notas organizadas em `Notebook`s, com histórico de versões (`NoteVersion`).
- **Contacts / Reviews** — CRUDs simples; Reviews são revisões semanais exibidas por `isoWeek` (segunda-feira — ver regra de timezone).
- **Auth** — login, 2FA e `AuditLog`.

Em ambiente `local` existe `/dev/design` (showcase do design system).

**Histórico de design:** `docs/superpowers/specs/` e `docs/superpowers/plans/` guardam os documentos de design e planos de implementação datados de cada feature — consulte antes de mudanças grandes em uma feature para entender as decisões originais.

### Domínio Finance (o mais complexo)

- **Valores monetários são criptografados em repouso** em colunas `*_encrypted` (`amount_encrypted`, `balance_encrypted`, `target_amount_encrypted`, …) via `App\Shared\Casts\EncryptedCast` / trait `Encryptable`. Nunca grave/consulte valores como texto puro.
- **Idempotência:** writes POST de finanças passam pelo middleware `idempotent` (alias → `EnsureIdempotent`). O cliente envia header `Idempotency-Key` (gerado pelo helper `resources/js/lib/idempotentPost.ts`); a resposta da primeira tentativa é cacheada na tabela `idempotency_keys` e re-emitida em replays (protege contra clique-duplo).
- **Aportes a metas são transferências internas:** um depósito em meta (`GoalDepositService`) cria um par de transações `type=transfer` entre a conta de origem e a *subconta virtual* (`is_internal`) da meta — não altera o patrimônio líquido. O fluxo antigo (`TransactionGoalController`/model `TransactionGoal`) está `@deprecated`; rotas comentadas em `web.php`.

### Regra de timezone (fonte recorrente de bugs)

Ao carimbar ou comparar "hoje", "semana/mês/ano atual", **sempre** use o fuso do usuário: `Carbon::now($user->timezone)` (fallback `'America/Sao_Paulo'`), nunca `now()`/`today()` em UTC — senão dá erro de um dia perto das viradas. Padrão já consolidado em CheckIn/Journal/Dashboard/Tasks/Library. Ao criar datas para `diffInDays`, crie-as no **mesmo fuso** para evitar drift de horas. Nota: `startOfWeek()` aqui começa no **domingo**, enquanto `isoWeek`/`isoWeekYear` (usados na exibição de reviews) são baseados em **segunda** — convenções diferentes.

## Testes

PHPUnit com `RefreshDatabase` e factories (`Database\Factories\`). Testes de feature batem nas rotas via `actingAs($user)->get/post(...)` e validam props com `assertInertia`. **Lógica de data/fuso deve ser testada com fuso não-UTC** (`User::factory()->create(['timezone' => 'America/Sao_Paulo'])`) e `travelTo(Carbon::parse('...', 'UTC'), fn() => ...)` para fixar o instante — ver `*TimezoneTest.php`.
