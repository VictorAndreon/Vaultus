# Vaultus — Design de Arquitetura Fundacional (Fase 0)

**Data:** 2026-05-07
**Escopo:** Infraestrutura, estrutura de código, banco de dados, segurança e plano de implementação modular
**Stack:** Laravel 11 (PHP 8.3) + PostgreSQL 16 + React + TypeScript + Inertia.js + Redis + Caddy + Docker

---

## 1. Decisões Fundamentais

| Decisão | Escolha | Motivo |
|---|---|---|
| Usuários | Único | Sistema pessoal — sem multi-tenancy |
| Deployment | Docker + Docker Compose | Portabilidade, isolamento, facilidade de backup |
| Reverse proxy | Caddy | HTTPS automático, configuração mínima |
| Filas | Redis + Laravel Horizon | Visibilidade de jobs, performance |
| Organização do código | Por domínio (Domain-Driven) | 11 módulos — pasta por tipo ficaria ilegível |

---

## 2. Infraestrutura Docker

### Serviços (docker-compose.yml)

| Serviço | Imagem | Função |
|---|---|---|
| `app` | php:8.3-fpm customizada | Laravel (PHP-FPM) |
| `db` | postgres:16-alpine | Banco de dados |
| `redis` | redis:7-alpine | Filas + cache |
| `horizon` | mesma imagem do `app` | Worker de filas (Horizon) |
| `scheduler` | mesma imagem do `app` | Roda `schedule:run` a cada minuto via loop |
| `caddy` | caddy:2-alpine | Reverse proxy + HTTPS automático |

`horizon` e `scheduler` compartilham a imagem do `app` com `command` diferentes — um único Dockerfile para manter.

### Estrutura de arquivos raiz

```
vaultus/
├── docker-compose.yml
├── docker-compose.override.yml     # overrides locais de dev
├── Caddyfile
├── .env
├── .env.example
└── src/                            # projeto Laravel
```

---

## 3. Estrutura de Pastas do Laravel

```
src/
├── app/
│   ├── Domains/
│   │   ├── Auth/
│   │   │   ├── Controllers/        # AuthController, TwoFactorController, SessionController
│   │   │   ├── Models/             # User, AuditLog
│   │   │   ├── Services/           # TwoFactorService, AuditLogger
│   │   │   └── Policies/
│   │   ├── Tasks/
│   │   │   ├── Controllers/        # BoardController, CardController, TimerController
│   │   │   ├── Models/             # Board, BoardColumn, Card, CardChecklist, CardTimer
│   │   │   ├── Services/           # TimerService
│   │   │   └── Policies/
│   │   ├── Projects/
│   │   │   ├── Controllers/        # ProjectController, ProjectNoteController, WantController
│   │   │   ├── Models/             # Project, ProjectNote, ProjectLink, ProjectTask, Want
│   │   │   ├── Services/           # WantPromotionService
│   │   │   └── Policies/
│   │   ├── Habits/
│   │   │   ├── Controllers/        # HabitController, CheckInController, HealthMetricController
│   │   │   ├── Models/             # Habit, HabitCheckIn, HealthMetric
│   │   │   ├── Services/           # StreakService
│   │   │   └── Policies/
│   │   ├── Journal/
│   │   │   ├── Controllers/        # JournalEntryController, PromptController
│   │   │   ├── Models/             # JournalEntry, JournalPrompt
│   │   │   ├── Services/           # JournalExportService
│   │   │   └── Policies/
│   │   ├── Finance/
│   │   │   ├── Controllers/        # AccountController, TransactionController, GoalController, WishlistController
│   │   │   ├── Models/             # Account, Transaction, FinancialGoal, WishlistItem
│   │   │   ├── Services/           # GoalProjectionService
│   │   │   └── Policies/
│   │   ├── Library/
│   │   │   ├── Controllers/        # LibraryItemController
│   │   │   ├── Models/             # LibraryItem (type: book|movie|series)
│   │   │   └── Policies/
│   │   ├── Notes/
│   │   │   ├── Controllers/        # NotebookController, NoteController
│   │   │   ├── Models/             # Notebook, Note, NoteVersion
│   │   │   └── Policies/
│   │   ├── Contacts/
│   │   │   ├── Controllers/        # ContactController, InteractionController
│   │   │   ├── Models/             # Contact, Interaction
│   │   │   ├── Services/           # BirthdayReminderService
│   │   │   └── Policies/
│   │   ├── Reviews/
│   │   │   ├── Controllers/        # ReviewController
│   │   │   ├── Models/             # Review
│   │   │   ├── Services/           # WeeklyReviewBuilder, MonthlyReviewBuilder
│   │   │   └── Policies/
│   │   └── Dashboard/
│   │       ├── Controllers/        # DashboardController
│   │       └── Services/           # DashboardAggregator
│   └── Shared/
│       ├── Casts/                  # EncryptedCast
│       ├── Traits/                 # Encryptable, HasAuditLog
│       ├── Services/               # BackupService, ExportService
│       └── Observers/              # AuditObserver
├── routes/
│   ├── web.php                     # rotas Inertia (UI)
│   └── api.php                     # rotas JSON para mobile (Sanctum tokens)
├── resources/
│   └── js/
│       ├── Pages/                  # componentes React por domínio
│       ├── Components/             # componentes reutilizáveis
│       └── Layouts/
└── tests/
    ├── Feature/                    # testes de feature por domínio
    └── Unit/
```

---

## 4. Banco de Dados

### 4.1 Ordem de Migrations (36 total)

| # | Migration | Depende de |
|---|---|---|
| 1 | `create_users_table` | — |
| 2 | `create_personal_access_tokens_table` | — (Sanctum, polimórfico) |
| 3 | `create_audit_logs_table` | users |
| 4 | `create_boards_table` | users |
| 5 | `create_board_columns_table` | boards |
| 6 | `create_tags_table` | users |
| 7 | `create_cards_table` | board_columns |
| 8 | `create_card_checklists_table` | cards |
| 9 | `create_card_timers_table` | cards |
| 10 | `create_card_tag_table` | cards, tags |
| 11 | `create_wants_table` | users |
| 12 | `create_projects_table` | users, wants |
| 13 | `create_project_columns_table` | projects |
| 14 | `create_project_tasks_table` | projects, project_columns |
| 15 | `create_project_task_timers_table` | project_tasks |
| 16 | `create_project_notes_table` | projects |
| 17 | `create_project_links_table` | projects |
| 18 | `create_project_files_table` | projects |
| 19 | `create_project_metrics_table` | projects |
| 20 | `create_habits_table` | users |
| 21 | `create_habit_check_ins_table` | habits |
| 22 | `create_health_metrics_table` | users |
| 23 | `create_journal_prompts_table` | users |
| 24 | `create_journal_entries_table` | users, health_metrics |
| 25 | `create_accounts_table` | users |
| 26 | `create_transactions_table` | accounts |
| 27 | `create_financial_goals_table` | users |
| 28 | `create_wishlist_items_table` | users, financial_goals |
| 29 | `create_transaction_goal_table` | transactions, financial_goals |
| 30 | `create_library_items_table` | users |
| 31 | `create_notebooks_table` | users |
| 32 | `create_notes_table` | notebooks |
| 33 | `create_note_versions_table` | notes |
| 34 | `create_contacts_table` | users |
| 35 | `create_interactions_table` | contacts |
| 36 | `create_reviews_table` | users |

### 4.2 Integrações entre domínios (FKs cruzadas)

Três pontos onde módulos se tocam no banco:

**Vontades → Projetos**
```sql
-- projects
want_id BIGINT NULLABLE REFERENCES wants(id) ON DELETE SET NULL
```
Quando uma vontade é promovida a projeto, o campo é preenchido. Se a vontade for soft-deleted, o projeto sobrevive com `want_id = null`.

**Saúde (Hábitos) → Diário**
```sql
-- journal_entries
health_metric_id BIGINT NULLABLE REFERENCES health_metrics(id) ON DELETE SET NULL
```
Ao abrir a entrada do dia, o sistema verifica se há um `health_metric` para hoje e pré-preenche humor/energia. `UNIQUE(user_id, date)` em ambas as tabelas garante uma entrada por dia.

**Wishlist → Metas Financeiras**
```sql
-- wishlist_items
financial_goal_id BIGINT NULLABLE REFERENCES financial_goals(id) ON DELETE SET NULL
```
Item da wishlist pode existir sem meta. Ao promover para meta, o campo é preenchido.

### 4.3 Schema de modelos com decisões não-óbvias

**`users`**
```sql
two_factor_secret         TEXT NULLABLE           -- criptografado via Laravel
two_factor_recovery_codes TEXT NULLABLE           -- criptografado via Laravel
two_factor_confirmed_at   TIMESTAMP NULLABLE
timezone                  VARCHAR(50) DEFAULT 'UTC'
dashboard_preferences     JSONB DEFAULT '{}'      -- widgets ativos e ordem
```

**`cards`**
```sql
board_column_id  BIGINT NOT NULL REFERENCES board_columns(id)
position         INTEGER NOT NULL DEFAULT 0       -- ordenação drag-and-drop
priority         VARCHAR(10) DEFAULT 'medium'     -- low|medium|high|urgent
total_seconds    INTEGER DEFAULT 0               -- atualizado ao parar timer
due_at           TIMESTAMP NULLABLE
deleted_at       TIMESTAMP NULLABLE               -- soft delete
```

**`health_metrics`**
```sql
UNIQUE(user_id, date)
sleep_hours  DECIMAL(4,2) NULLABLE
weight_kg    DECIMAL(5,2) NULLABLE
mood         SMALLINT NULLABLE                    -- 1–5
energy       SMALLINT NULLABLE                    -- 1–5
water_liters DECIMAL(4,2) NULLABLE
notes        TEXT NULLABLE
```

**`journal_entries`**
```sql
UNIQUE(user_id, date)
content          TEXT NOT NULL                    -- criptografado (EncryptedCast)
tags             TEXT[] DEFAULT '{}'              -- array nativo PostgreSQL
health_metric_id BIGINT NULLABLE
```

**`transactions`**
```sql
amount_encrypted TEXT NOT NULL                   -- EncryptedCast; valor em centavos (inteiro → string)
type             VARCHAR(7) NOT NULL             -- income|expense
occurred_at      DATE NOT NULL
category         VARCHAR(100)
```
Valores armazenados em centavos (inteiro) antes de criptografar — evita erros de ponto flutuante.

**`library_items`** — type discriminator (uma tabela para livros, filmes e séries)
```sql
type         VARCHAR(10) NOT NULL                -- book|movie|series
status       VARCHAR(15) NOT NULL                -- want|reading/watching|done|abandoned
author       VARCHAR(255) NULLABLE               -- somente livros
total_pages  INTEGER NULLABLE                    -- somente livros
current_page INTEGER NULLABLE DEFAULT 0          -- somente livros
platform     VARCHAR(100) NULLABLE               -- somente mídia
season_count INTEGER NULLABLE                    -- somente séries
```

---

## 5. Segurança

### 5.1 Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Força bruta no login | `throttle:5,1` + bloqueio temporário + `fail2ban` no host |
| Session fixation pós-2FA | Regenerar `session_id` após login; sessão inválida até TOTP validado |
| Token de API vazado | Sanctum tokens rotativos: uso invalida o anterior automaticamente |
| Dados sensíveis legíveis no banco | `EncryptedCast` em campos de diário, finanças, notas sensíveis |
| Backup exposto | Backup criptografado com GPG (AES-256) antes de sair do container |
| Container rodando como root | `user: 1000:1000` no Compose; PHP-FPM como não-root |
| XSS via Markdown renderizado | `DOMPurify` no client ao renderizar HTML de Markdown |
| CORS permissivo | Whitelist explícita no `.env` — apenas `APP_URL` e endereço do PWA |
| Upload malicioso | Validar MIME real (não extensão); armazenar fora de `public/` |

### 5.2 Cabeçalhos HTTP via Caddy

```
header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    X-Content-Type-Options "nosniff"
    X-Frame-Options "DENY"
    Content-Security-Policy "default-src 'self'; script-src 'self'; img-src 'self' data:"
    Referrer-Policy "strict-origin-when-cross-origin"
    -Server
}
```

### 5.3 Criptografia de campos sensíveis

**Cast customizado** (`app/Shared/Casts/EncryptedCast.php`):
- Usa `Crypt::encryptString` / `Crypt::decryptString` (AES-256-CBC via `APP_KEY`)
- Loga falhas de descriptografia sem expor o conteúdo
- Aplicado via `$casts` nos models — sem lógica espalhada

**Campos criptografados:**

| Model | Campo |
|---|---|
| `JournalEntry` | `content` |
| `Transaction` | `amount_encrypted` |
| `Account` | `balance_encrypted` |
| `Note` | `content` | Sempre criptografado — `$casts` estático não suporta condicional; custo desprezível para usuário único |
| `User` | `two_factor_secret` (Laravel nativo) |

`is_sensitive` em notas indica visibilidade na UI (ícone de cadeado, aviso antes de abrir), não o estado de criptografia — todo conteúdo de nota é criptografado igualmente.

**Busca em conteúdo criptografado:** descriptografar em PHP + `str_contains`. Viável para usuário único com volume baixo. `tsvector` do PostgreSQL usado apenas para campos não-criptografados (títulos, tags).

**Rotação de `APP_KEY`:** requer script de re-criptografia documentado em `README-OPS.md` no servidor (nunca no repositório).

---

## 6. Backup Automático

### Estratégia

`pg_dump` (plain SQL) + `gzip` + `gpg` (AES-256 com `BACKUP_PASSPHRASE` do `.env`), executado via comando Artisan agendado no Scheduler.

### Retenção grandfathered

| Tipo | Frequência | Retenção |
|---|---|---|
| Diário | Todo dia às 03:00 | 7 arquivos |
| Semanal | Domingo às 03:30 | 4 arquivos |
| Mensal | Dia 1 às 04:00 | 3 arquivos |

### Estrutura no volume

```
/backups/
  daily/    vaultus_YYYY-MM-DD.sql.gz.gpg
  weekly/   vaultus_YYYY-WNN.sql.gz.gpg
  monthly/  vaultus_YYYY-MM.sql.gz.gpg
```

### Rsync secundário (opcional)

Se `BACKUP_RSYNC_DEST` estiver configurado no `.env`, um job diário às 03:45 sincroniza `/backups/` para NAS ou HD externo. Sem configuração, job não roda.

### Restauração

```bash
gpg --passphrase "$BACKUP_PASSPHRASE" -d vaultus_2026-05-07.sql.gz.gpg \
  | gunzip \
  | psql vaultus_production
```

Procedimento documentado em `README-OPS.md` no servidor.

---

## 7. Plano de Implementação Modular

| Fase | Módulo | Justificativa |
|---|---|---|
| **0** | Infraestrutura + Auth + 2FA | Base de tudo — nenhum módulo funciona sem auth |
| **1** | Dashboard Central (estrutura) | Layout e widgets stub — completa na fase 11 |
| **2** | Hábitos + Métricas de Saúde | Gera dados que o Diário consome; valor imediato |
| **3** | Diário Pessoal | Depende de health_metrics (fase 2) |
| **4** | Kanban de Tarefas | Independente; timer integrado nesta fase |
| **5** | Projetos + Vontades | Reutiliza padrão de timer da fase 4 |
| **6** | Financeiro + Metas + Wishlist | Módulo com mais campos sensíveis — foco em criptografia |
| **7** | Anotações | Independente; editor Markdown já estabelecido |
| **8** | Biblioteca de Conteúdo | Independente; menor complexidade |
| **9** | Contatos & CRM | Alertas de aniversário integram ao Dashboard nesta fase |
| **10** | Revisões Periódicas | Agrega dados de todos os módulos — deve ser o último |
| **11** | Dashboard (completo) | Todos os widgets reais com dados reais de todos os módulos |

Cada fase entrega valor utilizável — o sistema é usado enquanto ainda está sendo construído.

---

## 8. Variáveis de Ambiente (.env.example)

```bash
APP_KEY=                        # gerado com php artisan key:generate
APP_URL=https://vaultus.local

DB_CONNECTION=pgsql
DB_HOST=db
DB_PORT=5432
DB_DATABASE=vaultus
DB_USERNAME=vaultus
DB_PASSWORD=

REDIS_HOST=redis
REDIS_PORT=6379

BACKUP_PASSPHRASE=              # senha GPG para backups
BACKUP_RSYNC_DEST=              # opcional: user@nas:/path ou /mnt/external

SANCTUM_STATEFUL_DOMAINS=vaultus.local
CORS_ALLOWED_ORIGINS=https://vaultus.local
```

Nenhum segredo hardcoded. Todos os valores sensíveis via `.env`.
