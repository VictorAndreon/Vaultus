# Vaultus Phase 0 — Infraestrutura, Auth & Fundação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configurar infraestrutura Docker completa, scaffold Laravel 11, todas as 36 migrations, autenticação com 2FA TOTP obrigatório, tokens Sanctum rotativos, criptografia de campos sensíveis e backup automático agendado com GPG.

**Architecture:** Docker Compose com 6 serviços (app, db, redis, horizon, scheduler, caddy). Laravel 11 organizado por domínio em `app/Domains/`. Web usa sessões Inertia; mobile API usa tokens Sanctum rotativos. Sessão é marcada com `auth.2fa_user_id` após login e só autenticada de fato após TOTP válido — o usuário não é considerado logado até completar ambos os fatores.

**Tech Stack:** PHP 8.3, Laravel 11, PostgreSQL 16, Redis 7, Caddy 2, Inertia.js 2.x, React 18, TypeScript 5, pragmarx/google2fa 8.x, bacon/bacon-qr-code 4.x, Laravel Horizon, Laravel Sanctum

> **Nota sobre desvio da spec:** `tags` em `journal_entries` e `notes` usa JSONB em vez de TEXT[] para compatibilidade nativa com os casts do Eloquent (`'array'`). Comportamento é idêntico; GIN indexing é igualmente suportado.

---

## Mapa de Arquivos

### Raiz do repositório
- Criar: `Dockerfile`
- Criar: `docker-compose.yml`
- Criar: `docker-compose.override.yml`
- Criar: `Caddyfile`
- Criar: `.env.example`
- Criar: `.dockerignore`
- Criar: `docker/php/php.ini`
- Criar: `docker/php/www.conf`
- Criar: `docker/postgres/init.sql`

### Laravel (dentro de `src/`)
- Criar: `src/` (via `composer create-project`)
- Modificar: `src/composer.json`
- Modificar: `src/vite.config.ts`
- Modificar: `src/tsconfig.json`
- Modificar: `src/resources/js/app.tsx`
- Modificar: `src/config/auth.php`
- Modificar: `src/phpunit.xml`
- Modificar: `src/routes/web.php`
- Modificar: `src/routes/api.php`

### Migrations (`src/database/migrations/`)
- 36 arquivos de migration (listados por tarefa)

### Domínios e Shared
- Criar: `src/app/Domains/Auth/Models/User.php`
- Criar: `src/app/Domains/Auth/Models/AuditLog.php`
- Criar: `src/app/Domains/Auth/Controllers/AuthController.php`
- Criar: `src/app/Domains/Auth/Controllers/TwoFactorController.php`
- Criar: `src/app/Domains/Auth/Services/TwoFactorService.php`
- Criar: `src/app/Domains/Auth/Services/AuditLogger.php`
- Criar: `src/app/Shared/Casts/EncryptedCast.php`
- Criar: `src/app/Shared/Services/BackupService.php`
- Criar: `src/app/Console/Commands/BackupDatabase.php`

### Frontend
- Criar: `src/resources/js/Pages/Auth/Login.tsx`
- Criar: `src/resources/js/Pages/Auth/TwoFactor.tsx`
- Criar: `src/resources/js/Pages/Dashboard/Index.tsx`

### Testes
- Criar: `src/tests/Unit/Shared/EncryptedCastTest.php`
- Criar: `src/tests/Feature/Auth/LoginTest.php`
- Criar: `src/tests/Feature/Auth/TwoFactorTest.php`
- Criar: `src/tests/Feature/Auth/SessionTest.php`
- Criar: `src/tests/Feature/Backup/BackupCommandTest.php`

---

## Task 1: Docker Compose + Dockerfile + Caddy

**Files:**
- Criar: `Dockerfile`
- Criar: `docker-compose.yml`
- Criar: `docker-compose.override.yml`
- Criar: `Caddyfile`
- Criar: `.dockerignore`
- Criar: `docker/php/php.ini`
- Criar: `docker/php/www.conf`
- Criar: `docker/postgres/init.sql`

- [ ] **Passo 1: Criar Dockerfile**

```dockerfile
# Dockerfile
FROM php:8.3-fpm-alpine

RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    icu-dev \
    oniguruma-dev \
    libpng-dev \
    gpg \
    gpg-agent \
    rsync \
    postgresql-client \
    && docker-php-ext-install \
        pdo_pgsql \
        pgsql \
        zip \
        bcmath \
        intl \
        mbstring \
        pcntl \
        gd \
    && pecl install redis \
    && docker-php-ext-enable redis

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

RUN addgroup -g 1000 -S www && adduser -u 1000 -S www -G www

WORKDIR /var/www/html

USER www
```

- [ ] **Passo 2: Criar docker/php/php.ini**

```ini
; docker/php/php.ini
upload_max_filesize = 20M
post_max_size = 20M
memory_limit = 256M
max_execution_time = 60
```

- [ ] **Passo 3: Criar docker/php/www.conf**

```ini
; docker/php/www.conf
[www]
user = www
group = www
listen = 0.0.0.0:9000
pm = dynamic
pm.max_children = 10
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 3
```

- [ ] **Passo 4: Criar docker/postgres/init.sql**

```sql
-- docker/postgres/init.sql
CREATE DATABASE vaultus_test;
```

- [ ] **Passo 5: Criar docker-compose.yml**

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    volumes:
      - ./src:/var/www/html
      - ./backups:/backups
      - ./docker/php/php.ini:/usr/local/etc/php/conf.d/custom.ini
      - ./docker/php/www.conf:/usr/local/etc/php-fpm.d/www.conf
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    env_file: .env
    user: "1000:1000"

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    environment:
      POSTGRES_DB: ${DB_DATABASE}
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USERNAME} -d ${DB_DATABASE}"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data

  horizon:
    build:
      context: .
      dockerfile: Dockerfile
    command: php artisan horizon
    volumes:
      - ./src:/var/www/html
    depends_on:
      - app
      - redis
    env_file: .env
    user: "1000:1000"
    restart: unless-stopped

  scheduler:
    build:
      context: .
      dockerfile: Dockerfile
    command: sh -c "while true; do php artisan schedule:run --no-interaction; sleep 60; done"
    volumes:
      - ./src:/var/www/html
      - ./backups:/backups
    depends_on:
      - app
      - db
    env_file: .env
    user: "1000:1000"
    restart: unless-stopped

  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
      - ./src/public:/var/www/html/public:ro
    depends_on:
      - app

volumes:
  pgdata:
  redisdata:
  caddy_data:
  caddy_config:
```

- [ ] **Passo 6: Criar docker-compose.override.yml**

```yaml
# docker-compose.override.yml
services:
  db:
    ports:
      - "5432:5432"

  app:
    environment:
      APP_ENV: local
      APP_DEBUG: "true"

  node:
    image: node:20-alpine
    working_dir: /var/www/html
    volumes:
      - ./src:/var/www/html
    command: sh -c "npm install && npm run dev -- --host 0.0.0.0"
    ports:
      - "5173:5173"
```

- [ ] **Passo 7: Criar Caddyfile**

```
{$APP_URL} {
    root * /var/www/html/public

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws: wss:"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }

    php_fastcgi app:9000
    file_server
    encode gzip
}
```

- [ ] **Passo 8: Criar .dockerignore**

```
.git
.worktrees
node_modules
src/node_modules
src/vendor
src/storage/logs/*
src/.env
backups
docs
```

- [ ] **Passo 9: Verificar arquivos criados**

```bash
ls docker/php/ docker/postgres/
```

Esperado: `php.ini  www.conf` e `init.sql`

---

## Task 2: Laravel 11 + Configuração Inicial

**Files:**
- Criar: `src/` (via composer)
- Criar: `.env.example`
- Modificar: `src/config/auth.php`
- Modificar: `src/phpunit.xml`

- [ ] **Passo 1: Instalar Laravel 11**

```bash
docker run --rm \
  -v $(pwd):/app \
  -w /app \
  composer:2 \
  composer create-project laravel/laravel src "^11.0" --prefer-dist
```

Esperado: pasta `src/` criada com estrutura padrão do Laravel 11.

- [ ] **Passo 2: Instalar pacotes PHP necessários**

```bash
docker run --rm \
  -v $(pwd)/src:/app \
  -w /app \
  composer:2 \
  composer require \
    laravel/sanctum \
    laravel/horizon \
    pragmarx/google2fa \
    bacon/bacon-qr-code \
    --no-interaction
```

- [ ] **Passo 3: Criar .env.example na raiz**

```
APP_NAME=Vaultus
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://vaultus.local

LOG_CHANNEL=stack
LOG_LEVEL=error

DB_CONNECTION=pgsql
DB_HOST=db
DB_PORT=5432
DB_DATABASE=vaultus
DB_USERNAME=vaultus
DB_PASSWORD=

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=null

CACHE_STORE=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
SESSION_LIFETIME=480

BACKUP_PASSPHRASE=
BACKUP_RSYNC_DEST=

SANCTUM_STATEFUL_DOMAINS=vaultus.local
CORS_ALLOWED_ORIGINS=https://vaultus.local
```

- [ ] **Passo 4: Copiar .env.example para .env e preencher valores de dev**

```bash
cp .env.example .env
```

Editar `.env` com:
```
APP_ENV=local
APP_DEBUG=true
DB_DATABASE=vaultus
DB_USERNAME=vaultus
DB_PASSWORD=secret
BACKUP_PASSPHRASE=dev-passphrase-insecure
```

- [ ] **Passo 5: Subir serviços base e gerar APP_KEY**

```bash
docker compose up -d db redis
docker compose run --rm app php artisan key:generate
```

Esperado: `APP_KEY=base64:...` preenchido no `.env`.

- [ ] **Passo 6: Publicar configs do Sanctum e Horizon**

```bash
docker compose run --rm app php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
docker compose run --rm app php artisan vendor:publish --provider="Laravel\Horizon\HorizonServiceProvider"
```

- [ ] **Passo 7: Configurar auth provider para User do domínio**

Editar `src/config/auth.php`:
```php
'providers' => [
    'users' => [
        'driver' => 'eloquent',
        'model' => App\Domains\Auth\Models\User::class,
    ],
],
```

- [ ] **Passo 8: Configurar phpunit.xml para banco de teste**

Adicionar dentro de `<php>` em `src/phpunit.xml`:
```xml
<env name="DB_DATABASE" value="vaultus_test"/>
<env name="DB_HOST" value="db"/>
<env name="CACHE_STORE" value="array"/>
<env name="QUEUE_CONNECTION" value="sync"/>
<env name="SESSION_DRIVER" value="array"/>
```

- [ ] **Passo 9: Deletar arquivos padrão que serão substituídos**

```bash
rm src/app/Models/User.php
rm src/database/migrations/0001_01_01_000000_create_users_table.php
rm src/database/migrations/0001_01_01_000001_create_cache_table.php
rm src/database/migrations/0001_01_01_000002_create_jobs_table.php
```

---

## Task 3: Inertia.js + React + TypeScript

**Files:**
- Modificar: `src/vite.config.ts`
- Criar: `src/tsconfig.json`
- Modificar: `src/resources/js/app.tsx`
- Criar: `src/resources/js/types/index.d.ts`

- [ ] **Passo 1: Instalar Inertia server-side**

```bash
docker compose run --rm app composer require inertiajs/inertia-laravel
docker compose run --rm app php artisan vendor:publish --provider="Inertia\ServiceProvider"
```

- [ ] **Passo 2: Instalar dependências Node**

```bash
docker compose run --rm node npm install @inertiajs/react react react-dom
docker compose run --rm node npm install -D @types/react @types/react-dom @vitejs/plugin-react typescript autoprefixer tailwindcss
```

- [ ] **Passo 3: Configurar vite.config.ts**

```typescript
// src/vite.config.ts
import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/js/app.tsx'],
            refresh: true,
        }),
        react(),
    ],
    server: {
        host: '0.0.0.0',
        hmr: { host: 'localhost' },
    },
})
```

- [ ] **Passo 4: Criar tsconfig.json**

```json
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "jsx": "react-jsx",
        "strict": true,
        "baseUrl": ".",
        "paths": { "@/*": ["resources/js/*"] },
        "types": ["vite/client"]
    },
    "include": ["resources/js/**/*"]
}
```

- [ ] **Passo 5: Criar app.tsx (entry point Inertia)**

```tsx
// src/resources/js/app.tsx
import '../css/app.css'
import { createInertiaApp } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'

createInertiaApp({
    resolve: (name) => {
        const pages = import.meta.glob('./Pages/**/*.tsx', { eager: true })
        return pages[`./Pages/${name}.tsx`]
    },
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />)
    },
    progress: { color: '#6366f1' },
})
```

- [ ] **Passo 6: Criar types globais**

```typescript
// src/resources/js/types/index.d.ts
export interface User {
    id: number
    name: string
    email: string
    two_factor_confirmed_at: string | null
}

export interface PageProps {
    auth: { user: User | null }
}
```

- [ ] **Passo 7: Criar app.blade.php para Inertia**

Criar `src/resources/views/app.blade.php`:
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    @viteReactRefresh
    @vite(['resources/js/app.tsx'])
    @inertiaHead
</head>
<body>
    @inertia
</body>
</html>
```

---

## Task 4: Estrutura de Pastas dos Domínios

- [ ] **Passo 1: Criar todos os diretórios**

```bash
domains=(Auth Tasks Projects Habits Journal Finance Library Notes Contacts Reviews Dashboard)
subdirs=(Controllers Models Services Policies)

for domain in "${domains[@]}"; do
  for sub in "${subdirs[@]}"; do
    mkdir -p "src/app/Domains/${domain}/${sub}"
  done
done

mkdir -p src/app/Shared/Casts
mkdir -p src/app/Shared/Traits
mkdir -p src/app/Shared/Services
mkdir -p src/app/Shared/Observers

mkdir -p src/tests/Feature/Auth
mkdir -p src/tests/Feature/Backup
mkdir -p src/tests/Unit/Shared
```

- [ ] **Passo 2: Verificar estrutura**

```bash
find src/app/Domains src/app/Shared -type d | sort
```

Esperado: todos os 44 diretórios listados sem erro.

---

## Task 5: Migrations — Fundação (users, tokens, audit_logs)

**Files:**
- Criar: `src/database/migrations/2026_05_07_000001_create_users_table.php`
- Criar: `src/database/migrations/2026_05_07_000002_create_personal_access_tokens_table.php`
- Criar: `src/database/migrations/2026_05_07_000003_create_audit_logs_table.php`

- [ ] **Passo 1: Criar migration de users**

```bash
docker compose run --rm app php artisan make:migration create_users_table
```

Substituir conteúdo gerado por:

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->text('two_factor_secret')->nullable();
            $table->text('two_factor_recovery_codes')->nullable();
            $table->timestamp('two_factor_confirmed_at')->nullable();
            $table->string('timezone', 50)->default('UTC');
            $table->jsonb('dashboard_preferences')->default('{}');
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void { Schema::dropIfExists('users'); }
};
```

- [ ] **Passo 2: Criar migration de personal_access_tokens**

```bash
docker compose run --rm app php artisan make:migration create_personal_access_tokens_table
```

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void { Schema::dropIfExists('personal_access_tokens'); }
};
```

- [ ] **Passo 3: Criar migration de audit_logs**

```bash
docker compose run --rm app php artisan make:migration create_audit_logs_table
```

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('event');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamp('created_at');
        });
    }

    public function down(): void { Schema::dropIfExists('audit_logs'); }
};
```

- [ ] **Passo 4: Rodar e verificar**

```bash
docker compose run --rm app php artisan migrate
```

Esperado: 3 migrations rodadas.

---

## Task 6: Migrations — Domínio Tasks

**Files:** migrations 4–10 (boards, board_columns, tags, cards, card_checklists, card_timers, card_tag)

- [ ] **Passo 1: Criar as 7 migrations do domínio Tasks**

Criar cada arquivo com `php artisan make:migration` e substituir o conteúdo:

**boards:**
```php
Schema::create('boards', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('name');
    $table->string('color', 7)->nullable();
    $table->integer('position')->default(0);
    $table->timestamps();
    $table->softDeletes();
});
```

**board_columns:**
```php
Schema::create('board_columns', function (Blueprint $table) {
    $table->id();
    $table->foreignId('board_id')->constrained()->cascadeOnDelete();
    $table->string('name');
    $table->string('color', 7)->nullable();
    $table->integer('position')->default(0);
    $table->timestamps();
});
```

**tags:**
```php
Schema::create('tags', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('name');
    $table->string('color', 7)->nullable();
    $table->timestamps();
});
```

**cards:**
```php
Schema::create('cards', function (Blueprint $table) {
    $table->id();
    $table->foreignId('board_column_id')->constrained()->cascadeOnDelete();
    $table->string('title');
    $table->text('description')->nullable();
    $table->string('priority', 10)->default('medium');
    $table->integer('position')->default(0);
    $table->integer('total_seconds')->default(0);
    $table->timestamp('due_at')->nullable();
    $table->timestamps();
    $table->softDeletes();
});
```

**card_checklists:**
```php
Schema::create('card_checklists', function (Blueprint $table) {
    $table->id();
    $table->foreignId('card_id')->constrained()->cascadeOnDelete();
    $table->string('title');
    $table->boolean('is_done')->default(false);
    $table->integer('position')->default(0);
    $table->timestamps();
});
```

**card_timers:**
```php
Schema::create('card_timers', function (Blueprint $table) {
    $table->id();
    $table->foreignId('card_id')->constrained()->cascadeOnDelete();
    $table->timestamp('started_at');
    $table->timestamp('stopped_at')->nullable();
    $table->integer('seconds')->nullable();
    $table->timestamps();
});
```

**card_tag (pivot):**
```php
Schema::create('card_tag', function (Blueprint $table) {
    $table->foreignId('card_id')->constrained()->cascadeOnDelete();
    $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
    $table->primary(['card_id', 'tag_id']);
});
```

- [ ] **Passo 2: Rodar e verificar**

```bash
docker compose run --rm app php artisan migrate
```

Esperado: 7 novas migrations rodadas.

---

## Task 7: Migrations — Domínio Projects

**Files:** migrations 11–19 (wants, projects, project_columns, project_tasks, project_task_timers, project_notes, project_links, project_files, project_metrics)

- [ ] **Passo 1: Criar as 9 migrations do domínio Projects**

**wants:**
```php
Schema::create('wants', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('title');
    $table->text('description')->nullable();
    $table->timestamps();
    $table->softDeletes();
});
```

**projects:**
```php
Schema::create('projects', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->foreignId('want_id')->nullable()->constrained()->nullOnDelete();
    $table->string('title');
    $table->text('description')->nullable();
    $table->string('status', 15)->default('idea');
    $table->string('category')->nullable();
    $table->string('cover_image')->nullable();
    $table->string('cover_color', 7)->nullable();
    $table->text('motivation')->nullable();
    $table->date('started_at')->nullable();
    $table->date('estimated_end_at')->nullable();
    $table->date('completed_at')->nullable();
    $table->integer('total_seconds')->default(0);
    $table->timestamps();
    $table->softDeletes();
});
```

**project_columns:**
```php
Schema::create('project_columns', function (Blueprint $table) {
    $table->id();
    $table->foreignId('project_id')->constrained()->cascadeOnDelete();
    $table->string('name');
    $table->integer('position')->default(0);
    $table->timestamps();
});
```

**project_tasks:**
```php
Schema::create('project_tasks', function (Blueprint $table) {
    $table->id();
    $table->foreignId('project_id')->constrained()->cascadeOnDelete();
    $table->foreignId('project_column_id')->constrained()->cascadeOnDelete();
    $table->string('title');
    $table->text('description')->nullable();
    $table->string('priority', 10)->default('medium');
    $table->integer('position')->default(0);
    $table->integer('total_seconds')->default(0);
    $table->timestamp('due_at')->nullable();
    $table->timestamps();
    $table->softDeletes();
});
```

**project_task_timers:**
```php
Schema::create('project_task_timers', function (Blueprint $table) {
    $table->id();
    $table->foreignId('project_task_id')->constrained()->cascadeOnDelete();
    $table->timestamp('started_at');
    $table->timestamp('stopped_at')->nullable();
    $table->integer('seconds')->nullable();
    $table->timestamps();
});
```

**project_notes:**
```php
Schema::create('project_notes', function (Blueprint $table) {
    $table->id();
    $table->foreignId('project_id')->constrained()->cascadeOnDelete();
    $table->text('content');
    $table->timestamps();
    $table->softDeletes();
});
```

**project_links:**
```php
Schema::create('project_links', function (Blueprint $table) {
    $table->id();
    $table->foreignId('project_id')->constrained()->cascadeOnDelete();
    $table->string('title');
    $table->string('url');
    $table->timestamps();
});
```

**project_files:**
```php
Schema::create('project_files', function (Blueprint $table) {
    $table->id();
    $table->foreignId('project_id')->constrained()->cascadeOnDelete();
    $table->string('filename');
    $table->string('path');
    $table->string('mime_type');
    $table->integer('size');
    $table->timestamps();
});
```

**project_metrics:**
```php
Schema::create('project_metrics', function (Blueprint $table) {
    $table->id();
    $table->foreignId('project_id')->constrained()->cascadeOnDelete();
    $table->string('key');
    $table->string('value');
    $table->timestamps();
});
```

- [ ] **Passo 2: Rodar e verificar**

```bash
docker compose run --rm app php artisan migrate
```

Esperado: 9 novas migrations rodadas.

---

## Task 8: Migrations — Domínios Habits & Journal

**Files:** migrations 20–24

- [ ] **Passo 1: Criar as 5 migrations**

**habits:**
```php
Schema::create('habits', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('name');
    $table->string('icon')->nullable();
    $table->string('frequency_type', 20);
    $table->jsonb('frequency_days')->nullable();
    $table->integer('frequency_times')->nullable();
    $table->string('category')->nullable();
    $table->integer('current_streak')->default(0);
    $table->integer('best_streak')->default(0);
    $table->boolean('is_active')->default(true);
    $table->timestamps();
    $table->softDeletes();
});
```

**habit_check_ins:**
```php
Schema::create('habit_check_ins', function (Blueprint $table) {
    $table->id();
    $table->foreignId('habit_id')->constrained()->cascadeOnDelete();
    $table->date('date');
    $table->timestamps();
    $table->unique(['habit_id', 'date']);
});
```

**health_metrics:**
```php
Schema::create('health_metrics', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->date('date');
    $table->decimal('sleep_hours', 4, 2)->nullable();
    $table->decimal('weight_kg', 5, 2)->nullable();
    $table->smallInteger('mood')->nullable();
    $table->smallInteger('energy')->nullable();
    $table->decimal('water_liters', 4, 2)->nullable();
    $table->text('notes')->nullable();
    $table->timestamps();
    $table->unique(['user_id', 'date']);
});
```

**journal_prompts:**
```php
Schema::create('journal_prompts', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('content');
    $table->boolean('is_active')->default(true);
    $table->integer('position')->default(0);
    $table->timestamps();
});
```

**journal_entries:**
```php
Schema::create('journal_entries', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->date('date');
    $table->text('content');
    $table->jsonb('tags')->default('[]');
    $table->foreignId('health_metric_id')->nullable()->constrained()->nullOnDelete();
    $table->timestamps();
    $table->softDeletes();
    $table->unique(['user_id', 'date']);
});
```

- [ ] **Passo 2: Rodar e verificar**

```bash
docker compose run --rm app php artisan migrate
```

Esperado: 5 novas migrations rodadas.

---

## Task 9: Migrations — Domínio Finance

**Files:** migrations 25–29

- [ ] **Passo 1: Criar as 5 migrations**

**accounts:**
```php
Schema::create('accounts', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('name');
    $table->string('type', 15);
    $table->text('balance_encrypted');
    $table->string('currency', 3)->default('BRL');
    $table->timestamps();
    $table->softDeletes();
});
```

**transactions:**
```php
Schema::create('transactions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('account_id')->constrained()->cascadeOnDelete();
    $table->string('type', 7);
    $table->text('amount_encrypted');
    $table->string('description');
    $table->string('category', 100)->nullable();
    $table->date('occurred_at');
    $table->timestamps();
    $table->softDeletes();
});
```

**financial_goals:**
```php
Schema::create('financial_goals', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('name');
    $table->text('target_amount_encrypted');
    $table->text('current_amount_encrypted');
    $table->string('category', 50)->nullable();
    $table->date('deadline')->nullable();
    $table->boolean('is_completed')->default(false);
    $table->boolean('is_archived')->default(false);
    $table->timestamps();
    $table->softDeletes();
});
```

**wishlist_items:**
```php
Schema::create('wishlist_items', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->foreignId('financial_goal_id')->nullable()->constrained()->nullOnDelete();
    $table->string('name');
    $table->text('estimated_price_encrypted')->nullable();
    $table->string('priority', 10)->default('medium');
    $table->string('url')->nullable();
    $table->text('notes')->nullable();
    $table->timestamps();
    $table->softDeletes();
});
```

**transaction_goal (pivot com amount):**
```php
Schema::create('transaction_goal', function (Blueprint $table) {
    $table->id();
    $table->foreignId('transaction_id')->constrained()->cascadeOnDelete();
    $table->foreignId('financial_goal_id')->constrained()->cascadeOnDelete();
    $table->text('amount_encrypted');
    $table->timestamps();
});
```

- [ ] **Passo 2: Rodar e verificar**

```bash
docker compose run --rm app php artisan migrate
```

Esperado: 5 novas migrations rodadas.

---

## Task 10: Migrations — Library, Notes, Contacts, Reviews

**Files:** migrations 30–36

- [ ] **Passo 1: Criar as 7 migrations restantes**

**library_items:**
```php
Schema::create('library_items', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('type', 10);
    $table->string('title');
    $table->string('status', 15);
    $table->smallInteger('rating')->nullable();
    $table->text('notes')->nullable();
    $table->string('genre')->nullable();
    $table->string('cover_url')->nullable();
    $table->string('author')->nullable();
    $table->integer('total_pages')->nullable();
    $table->integer('current_page')->nullable()->default(0);
    $table->string('platform', 100)->nullable();
    $table->integer('season_count')->nullable();
    $table->date('started_at')->nullable();
    $table->date('finished_at')->nullable();
    $table->timestamps();
    $table->softDeletes();
});
```

**notebooks:**
```php
Schema::create('notebooks', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('name');
    $table->string('color', 7)->nullable();
    $table->timestamps();
    $table->softDeletes();
});
```

**notes:**
```php
Schema::create('notes', function (Blueprint $table) {
    $table->id();
    $table->foreignId('notebook_id')->constrained()->cascadeOnDelete();
    $table->string('title');
    $table->text('content');
    $table->boolean('is_sensitive')->default(false);
    $table->jsonb('tags')->default('[]');
    $table->timestamps();
    $table->softDeletes();
});
```

**note_versions:**
```php
Schema::create('note_versions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('note_id')->constrained()->cascadeOnDelete();
    $table->text('content');
    $table->timestamp('created_at');
});
```

**contacts:**
```php
Schema::create('contacts', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('name');
    $table->string('photo')->nullable();
    $table->date('birthday')->nullable();
    $table->string('context', 50)->nullable();
    $table->string('next_step')->nullable();
    $table->date('last_contacted_at')->nullable();
    $table->integer('remind_after_days')->nullable();
    $table->text('notes')->nullable();
    $table->timestamps();
    $table->softDeletes();
});
```

**interactions:**
```php
Schema::create('interactions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
    $table->text('summary');
    $table->date('occurred_at');
    $table->timestamps();
    $table->softDeletes();
});
```

**reviews:**
```php
Schema::create('reviews', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('type', 10);
    $table->date('period_start');
    $table->date('period_end');
    $table->jsonb('content')->default('{}');
    $table->timestamps();
    $table->softDeletes();
});
```

- [ ] **Passo 2: Rodar e verificar contagem total**

```bash
docker compose run --rm app php artisan migrate
docker compose run --rm app php artisan migrate:status | grep -c "Ran"
```

Esperado: `36`

---

## Task 11: EncryptedCast (TDD)

**Files:**
- Criar: `src/app/Shared/Casts/EncryptedCast.php`
- Criar: `src/tests/Unit/Shared/EncryptedCastTest.php`

- [ ] **Passo 1: Escrever o teste**

```php
<?php
// tests/Unit/Shared/EncryptedCastTest.php

namespace Tests\Unit\Shared;

use App\Shared\Casts\EncryptedCast;
use Illuminate\Support\Facades\Crypt;
use Tests\TestCase;

class EncryptedCastTest extends TestCase
{
    private EncryptedCast $cast;

    protected function setUp(): void
    {
        parent::setUp();
        $this->cast = new EncryptedCast();
    }

    public function test_encrypts_value_on_set(): void
    {
        $result = $this->cast->set(null, 'content', 'hello world', []);

        $this->assertNotEquals('hello world', $result);
        $this->assertEquals('hello world', Crypt::decryptString($result));
    }

    public function test_decrypts_value_on_get(): void
    {
        $encrypted = Crypt::encryptString('secret data');

        $result = $this->cast->get(null, 'content', $encrypted, []);

        $this->assertEquals('secret data', $result);
    }

    public function test_returns_null_when_value_is_null_on_set(): void
    {
        $this->assertNull($this->cast->set(null, 'content', null, []));
    }

    public function test_returns_null_when_value_is_null_on_get(): void
    {
        $this->assertNull($this->cast->get(null, 'content', null, []));
    }

    public function test_returns_null_and_logs_on_invalid_encrypted_value(): void
    {
        $result = $this->cast->get(null, 'content', 'not-encrypted-data', []);

        $this->assertNull($result);
    }
}
```

- [ ] **Passo 2: Rodar e confirmar que falha**

```bash
docker compose run --rm app php artisan test tests/Unit/Shared/EncryptedCastTest.php
```

Esperado: FAIL — `Class "App\Shared\Casts\EncryptedCast" not found`

- [ ] **Passo 3: Implementar EncryptedCast**

```php
<?php
// app/Shared/Casts/EncryptedCast.php

namespace App\Shared\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;

class EncryptedCast implements CastsAttributes
{
    public function get($model, string $key, $value, array $attributes): ?string
    {
        if ($value === null) {
            return null;
        }

        try {
            return Crypt::decryptString($value);
        } catch (DecryptException) {
            Log::critical('EncryptedCast: falha ao descriptografar', [
                'key' => $key,
                'model' => $model ? get_class($model) : null,
            ]);
            return null;
        }
    }

    public function set($model, string $key, $value, array $attributes): ?string
    {
        if ($value === null) {
            return null;
        }

        return Crypt::encryptString((string) $value);
    }
}
```

- [ ] **Passo 4: Rodar e confirmar que passa**

```bash
docker compose run --rm app php artisan test tests/Unit/Shared/EncryptedCastTest.php
```

Esperado: 5 testes passando.

- [ ] **Passo 5: Commit**

```bash
git add src/app/Shared/Casts/EncryptedCast.php src/tests/Unit/Shared/EncryptedCastTest.php
git commit -m "feat: add EncryptedCast for sensitive field encryption"
```

---

## Task 12: User Model + AuditLog Model

**Files:**
- Criar: `src/app/Domains/Auth/Models/User.php`
- Criar: `src/app/Domains/Auth/Models/AuditLog.php`

- [ ] **Passo 1: Criar User model**

```php
<?php
// app/Domains/Auth/Models/User.php

namespace App\Domains\Auth\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, SoftDeletes, HasApiTokens;

    protected $fillable = [
        'name', 'email', 'password', 'timezone', 'dashboard_preferences',
        'two_factor_secret', 'two_factor_recovery_codes', 'two_factor_confirmed_at',
    ];

    protected $hidden = [
        'password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted',
            'dashboard_preferences' => 'array',
            'password' => 'hashed',
        ];
    }

    public function hasTwoFactorEnabled(): bool
    {
        return $this->two_factor_confirmed_at !== null;
    }

    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class);
    }
}
```

- [ ] **Passo 2: Criar AuditLog model**

```php
<?php
// app/Domains/Auth/Models/AuditLog.php

namespace App\Domains\Auth\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id', 'event', 'ip_address', 'user_agent', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
```

- [ ] **Passo 3: Criar User factory**

```bash
docker compose run --rm app php artisan make:factory UserFactory --model="App\\Domains\\Auth\\Models\\User"
```

Substituir conteúdo de `src/database/factories/UserFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Domains\Auth\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => 'password',
            'timezone' => 'UTC',
            'dashboard_preferences' => [],
            'remember_token' => Str::random(10),
        ];
    }
}
```

- [ ] **Passo 4: Verificar que o model é resolvido**

```bash
docker compose run --rm app php artisan tinker --execute="echo App\Domains\Auth\Models\User::class;"
```

Esperado: `App\Domains\Auth\Models\User`

---

## Task 13: TwoFactorService (TDD)

**Files:**
- Criar: `src/app/Domains/Auth/Services/TwoFactorService.php`
- Criar: `src/tests/Feature/Auth/TwoFactorSetupTest.php`

- [ ] **Passo 1: Escrever testes**

```php
<?php
// tests/Feature/Auth/TwoFactorSetupTest.php

namespace Tests\Feature\Auth;

use App\Domains\Auth\Models\User;
use App\Domains\Auth\Services\TwoFactorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class TwoFactorSetupTest extends TestCase
{
    use RefreshDatabase;

    private TwoFactorService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(TwoFactorService::class);
    }

    public function test_generates_secret_and_qr_svg(): void
    {
        $user = User::factory()->create(['email' => 'test@example.com']);

        $result = $this->service->generateSetup($user);

        $this->assertArrayHasKey('secret', $result);
        $this->assertArrayHasKey('qr_svg', $result);
        $this->assertNotEmpty($result['secret']);
        $this->assertStringContainsString('<svg', $result['qr_svg']);
    }

    public function test_verifies_valid_otp(): void
    {
        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();
        $user = User::factory()->create(['two_factor_secret' => $secret]);
        $otp = $google2fa->getCurrentOtp($secret);

        $this->assertTrue($this->service->verify($user, $otp));
    }

    public function test_rejects_invalid_otp(): void
    {
        $user = User::factory()->create(['two_factor_secret' => 'JBSWY3DPEHPK3PXP']);

        $this->assertFalse($this->service->verify($user, '000000'));
    }

    public function test_confirms_two_factor_setup(): void
    {
        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();
        $user = User::factory()->create(['two_factor_secret' => $secret]);
        $otp = $google2fa->getCurrentOtp($secret);

        $this->service->confirm($user, $otp);

        $this->assertNotNull($user->fresh()->two_factor_confirmed_at);
    }
}
```

- [ ] **Passo 2: Rodar e confirmar que falha**

```bash
docker compose run --rm app php artisan test tests/Feature/Auth/TwoFactorSetupTest.php
```

Esperado: FAIL — `Class "App\Domains\Auth\Services\TwoFactorService" not found`

- [ ] **Passo 3: Implementar TwoFactorService**

```php
<?php
// app/Domains/Auth/Services/TwoFactorService.php

namespace App\Domains\Auth\Services;

use App\Domains\Auth\Models\User;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorService
{
    public function __construct(private Google2FA $google2fa) {}

    public function generateSetup(User $user): array
    {
        $secret = $this->google2fa->generateSecretKey();

        $qrCodeUrl = $this->google2fa->getQRCodeUrl(
            config('app.name'),
            $user->email,
            $secret
        );

        $renderer = new ImageRenderer(
            new RendererStyle(200),
            new SvgImageBackEnd()
        );
        $qrSvg = (new Writer($renderer))->writeString($qrCodeUrl);

        return ['secret' => $secret, 'qr_svg' => $qrSvg];
    }

    public function verify(User $user, string $otp): bool
    {
        if (!$user->two_factor_secret) {
            return false;
        }

        return (bool) $this->google2fa->verifyKey($user->two_factor_secret, $otp);
    }

    public function confirm(User $user, string $otp): void
    {
        if (!$this->verify($user, $otp)) {
            throw new \RuntimeException('OTP inválido');
        }

        $user->update(['two_factor_confirmed_at' => now()]);
    }

    public function disable(User $user): void
    {
        $user->update([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ]);
    }
}
```

- [ ] **Passo 4: Rodar e confirmar que passa**

```bash
docker compose run --rm app php artisan test tests/Feature/Auth/TwoFactorSetupTest.php
```

Esperado: 4 testes passando.

- [ ] **Passo 5: Commit**

```bash
git add src/app/Domains/Auth/Services/TwoFactorService.php \
        src/tests/Feature/Auth/TwoFactorSetupTest.php \
        src/database/factories/UserFactory.php
git commit -m "feat: add TwoFactorService with TOTP setup and verification"
```

---

## Task 14: AuditLogger + AuthController (TDD)

**Files:**
- Criar: `src/app/Domains/Auth/Services/AuditLogger.php`
- Criar: `src/app/Domains/Auth/Controllers/AuthController.php`
- Criar: `src/tests/Feature/Auth/LoginTest.php`

- [ ] **Passo 1: Escrever testes de login**

```php
<?php
// tests/Feature/Auth/LoginTest.php

namespace Tests\Feature\Auth;

use App\Domains\Auth\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_page_is_accessible(): void
    {
        $this->get('/login')->assertStatus(200);
    }

    public function test_user_without_2fa_is_logged_in_directly(): void
    {
        $user = User::factory()->create(['email' => 'user@example.com', 'password' => 'password']);

        $this->post('/login', ['email' => 'user@example.com', 'password' => 'password'])
            ->assertRedirect('/dashboard');

        $this->assertAuthenticatedAs($user);
    }

    public function test_user_with_2fa_is_redirected_to_two_factor_page(): void
    {
        $user = User::factory()->create([
            'email' => 'user@example.com',
            'password' => 'password',
            'two_factor_confirmed_at' => now(),
            'two_factor_secret' => 'JBSWY3DPEHPK3PXP',
        ]);

        $this->post('/login', ['email' => 'user@example.com', 'password' => 'password'])
            ->assertRedirect('/two-factor');

        $this->assertGuest();
        $this->assertEquals($user->id, session('auth.2fa_user_id'));
    }

    public function test_invalid_credentials_return_error(): void
    {
        User::factory()->create(['email' => 'user@example.com', 'password' => 'password']);

        $this->post('/login', ['email' => 'user@example.com', 'password' => 'wrong'])
            ->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_logout_clears_session(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->post('/logout');
        $this->assertGuest();
    }
}
```

- [ ] **Passo 2: Rodar e confirmar que falha**

```bash
docker compose run --rm app php artisan test tests/Feature/Auth/LoginTest.php
```

Esperado: FAIL — rotas não existem.

- [ ] **Passo 3: Criar AuditLogger**

```php
<?php
// app/Domains/Auth/Services/AuditLogger.php

namespace App\Domains\Auth\Services;

use App\Domains\Auth\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogger
{
    public function __construct(private Request $request) {}

    public function log(string $event, ?int $userId = null, array $metadata = []): void
    {
        AuditLog::create([
            'user_id' => $userId,
            'event' => $event,
            'ip_address' => $this->request->ip(),
            'user_agent' => $this->request->userAgent(),
            'metadata' => empty($metadata) ? null : $metadata,
        ]);
    }
}
```

- [ ] **Passo 4: Criar AuthController**

```php
<?php
// app/Domains/Auth/Controllers/AuthController.php

namespace App\Domains\Auth\Controllers;

use App\Domains\Auth\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function __construct(private AuditLogger $audit) {}

    public function showLogin()
    {
        return Inertia::render('Auth/Login');
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $key = 'login.' . $request->ip();

        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            throw ValidationException::withMessages([
                'email' => "Muitas tentativas. Aguarde {$seconds} segundos.",
            ]);
        }

        if (!Auth::attempt($credentials, $request->boolean('remember'))) {
            RateLimiter::hit($key, 60);
            $this->audit->log('login_failed', null, ['email' => $credentials['email']]);

            throw ValidationException::withMessages(['email' => 'Credenciais inválidas.']);
        }

        RateLimiter::clear($key);

        $user = Auth::user();

        if ($user->hasTwoFactorEnabled()) {
            Auth::logout();
            $request->session()->put('auth.2fa_user_id', $user->id);
            return redirect()->route('two-factor.show');
        }

        $request->session()->regenerate();
        $this->audit->log('login', $user->id);

        return redirect()->intended('/dashboard');
    }

    public function logout(Request $request)
    {
        $userId = Auth::id();
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        $this->audit->log('logout', $userId);

        return redirect('/login');
    }

    public function apiLogin(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
            'device_name' => ['required', 'string'],
        ]);

        $user = \App\Domains\Auth\Models\User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            $this->audit->log('api_login_failed', null, ['email' => $data['email']]);
            throw ValidationException::withMessages(['email' => 'Credenciais inválidas.']);
        }

        if ($user->hasTwoFactorEnabled()) {
            $request->validate(['totp_code' => ['required', 'string', 'size:6']]);
            $twoFactor = app(\App\Domains\Auth\Services\TwoFactorService::class);

            if (!$twoFactor->verify($user, $request->totp_code)) {
                throw ValidationException::withMessages(['totp_code' => 'Código 2FA inválido.']);
            }
        }

        $user->tokens()->where('name', $data['device_name'])->delete();
        $token = $user->createToken($data['device_name']);
        $this->audit->log('api_login', $user->id, ['device' => $data['device_name']]);

        return response()->json(['token' => $token->plainTextToken]);
    }

    public function apiLogout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Deslogado com sucesso.']);
    }
}
```

- [ ] **Passo 5: Criar TwoFactorController (stub completo)**

```php
<?php
// app/Domains/Auth/Controllers/TwoFactorController.php

namespace App\Domains\Auth\Controllers;

use App\Domains\Auth\Models\User;
use App\Domains\Auth\Services\AuditLogger;
use App\Domains\Auth\Services\TwoFactorService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class TwoFactorController extends Controller
{
    public function __construct(
        private TwoFactorService $twoFactor,
        private AuditLogger $audit
    ) {}

    public function show(Request $request)
    {
        if (!$request->session()->has('auth.2fa_user_id')) {
            return redirect()->route('login');
        }

        return Inertia::render('Auth/TwoFactor');
    }

    public function verify(Request $request)
    {
        $request->validate(['code' => ['required', 'string', 'size:6']]);

        $userId = $request->session()->get('auth.2fa_user_id');
        if (!$userId) {
            return redirect()->route('login');
        }

        $user = User::findOrFail($userId);

        if (!$this->twoFactor->verify($user, $request->code)) {
            $this->audit->log('2fa_failed', $user->id);
            throw ValidationException::withMessages(['code' => 'Código inválido.']);
        }

        $request->session()->forget('auth.2fa_user_id');
        $request->session()->regenerate();
        Auth::login($user);
        $this->audit->log('login', $user->id, ['method' => '2fa']);

        return redirect()->intended('/dashboard');
    }
}
```

- [ ] **Passo 6: Configurar routes/web.php**

```php
<?php
// routes/web.php

use App\Domains\Auth\Controllers\AuthController;
use App\Domains\Auth\Controllers\TwoFactorController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/two-factor', [TwoFactorController::class, 'show'])->name('two-factor.show');
    Route::post('/two-factor', [TwoFactorController::class, 'verify'])->name('two-factor.verify');
});

Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/dashboard', fn() => inertia('Dashboard/Index'))->name('dashboard');
});
```

- [ ] **Passo 7: Configurar routes/api.php**

```php
<?php
// routes/api.php

use App\Domains\Auth\Controllers\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'apiLogin']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', fn(Request $request) => $request->user());
    Route::post('/logout', [AuthController::class, 'apiLogout']);
});
```

- [ ] **Passo 8: Rodar testes e confirmar que passam**

```bash
docker compose run --rm app php artisan test tests/Feature/Auth/LoginTest.php
```

Esperado: 5 testes passando.

- [ ] **Passo 9: Commit**

```bash
git add src/app/Domains/Auth/ src/routes/
git commit -m "feat: add login/logout flow with 2FA redirect, rate limiting and API tokens"
```

---

## Task 15: Testes de 2FA e Sessão

**Files:**
- Criar: `src/tests/Feature/Auth/TwoFactorTest.php`
- Criar: `src/tests/Feature/Auth/SessionTest.php`

- [ ] **Passo 1: Escrever testes de 2FA**

```php
<?php
// tests/Feature/Auth/TwoFactorTest.php

namespace Tests\Feature\Auth;

use App\Domains\Auth\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class TwoFactorTest extends TestCase
{
    use RefreshDatabase;

    public function test_two_factor_page_requires_pending_session(): void
    {
        $this->get('/two-factor')->assertRedirect('/login');
    }

    public function test_valid_otp_logs_user_in(): void
    {
        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();
        $user = User::factory()->create([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
        ]);
        $otp = $google2fa->getCurrentOtp($secret);

        $this->withSession(['auth.2fa_user_id' => $user->id])
            ->post('/two-factor', ['code' => $otp])
            ->assertRedirect('/dashboard');

        $this->assertAuthenticatedAs($user);
    }

    public function test_invalid_otp_returns_error(): void
    {
        $user = User::factory()->create([
            'two_factor_secret' => 'JBSWY3DPEHPK3PXP',
            'two_factor_confirmed_at' => now(),
        ]);

        $this->withSession(['auth.2fa_user_id' => $user->id])
            ->post('/two-factor', ['code' => '000000'])
            ->assertSessionHasErrors('code');

        $this->assertGuest();
    }
}
```

- [ ] **Passo 2: Escrever testes de sessão**

```php
<?php
// tests/Feature/Auth/SessionTest.php

namespace Tests\Feature\Auth;

use App\Domains\Auth\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_is_redirected_to_login(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_authenticated_user_can_access_dashboard(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->get('/dashboard')->assertStatus(200);
    }

    public function test_guest_cannot_post_to_logout(): void
    {
        $this->post('/logout')->assertRedirect('/login');
    }
}
```

- [ ] **Passo 3: Rodar todos os testes de auth**

```bash
docker compose run --rm app php artisan test tests/Feature/Auth/
```

Esperado: todos passando.

- [ ] **Passo 4: Commit**

```bash
git add src/tests/Feature/Auth/TwoFactorTest.php src/tests/Feature/Auth/SessionTest.php
git commit -m "test: add 2FA verification and session guard tests"
```

---

## Task 16: BackupService + BackupDatabase Command (TDD)

**Files:**
- Criar: `src/app/Shared/Services/BackupService.php`
- Criar: `src/app/Console/Commands/BackupDatabase.php`
- Criar: `src/config/backup.php`
- Criar: `src/tests/Feature/Backup/BackupCommandTest.php`

- [ ] **Passo 1: Escrever testes**

```php
<?php
// tests/Feature/Backup/BackupCommandTest.php

namespace Tests\Feature\Backup;

use App\Shared\Services\BackupService;
use Tests\TestCase;

class BackupCommandTest extends TestCase
{
    public function test_backup_command_calls_service_and_exits_zero(): void
    {
        $mock = $this->mock(BackupService::class);
        $mock->shouldReceive('run')->once()->with('daily')->andReturn('/backups/daily/test.gpg');
        $mock->shouldReceive('pruneOld')->once()->with('daily');

        $this->artisan('backup:run --type=daily')->assertExitCode(0);
    }

    public function test_backup_command_accepts_weekly_type(): void
    {
        $mock = $this->mock(BackupService::class);
        $mock->shouldReceive('run')->once()->with('weekly')->andReturn('/backups/weekly/test.gpg');
        $mock->shouldReceive('pruneOld')->once()->with('weekly');

        $this->artisan('backup:run --type=weekly')->assertExitCode(0);
    }

    public function test_backup_command_returns_failure_on_exception(): void
    {
        $mock = $this->mock(BackupService::class);
        $mock->shouldReceive('run')->andThrow(new \RuntimeException('pg_dump falhou'));

        $this->artisan('backup:run --type=daily')->assertExitCode(1);
    }

    public function test_invalid_type_returns_failure(): void
    {
        $this->artisan('backup:run --type=invalid')->assertExitCode(1);
    }
}
```

- [ ] **Passo 2: Rodar e confirmar que falha**

```bash
docker compose run --rm app php artisan test tests/Feature/Backup/BackupCommandTest.php
```

Esperado: FAIL — comando não existe.

- [ ] **Passo 3: Criar config/backup.php**

```php
<?php
// config/backup.php

return [
    'passphrase' => env('BACKUP_PASSPHRASE', ''),
    'rsync_destination' => env('BACKUP_RSYNC_DEST', ''),
];
```

- [ ] **Passo 4: Criar BackupService**

O serviço usa `proc_open` com argumentos como array separado para evitar injeção de shell:

```php
<?php
// app/Shared/Services/BackupService.php

namespace App\Shared\Services;

use RuntimeException;

class BackupService
{
    private array $retention = ['daily' => 7, 'weekly' => 4, 'monthly' => 3];

    public function run(string $type): string
    {
        $filename = $this->filename($type);
        $dir = '/backups/' . $type;

        if (!is_dir($dir)) {
            mkdir($dir, 0750, true);
        }

        $path = "{$dir}/{$filename}";

        $db = config('database.connections.pgsql.database');
        $host = config('database.connections.pgsql.host');
        $port = (string) config('database.connections.pgsql.port');
        $user = config('database.connections.pgsql.username');
        $password = config('database.connections.pgsql.password');
        $passphrase = config('backup.passphrase');

        // Construir pipeline sem shell interpolation:
        // pg_dump | gzip | gpg -o $path
        // Usamos proc_open encadeado para manter cada processo isolado
        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $env = array_merge($_ENV, ['PGPASSWORD' => $password]);

        $dumpProc = proc_open(
            ['pg_dump', '-h', $host, '-p', $port, '-U', $user, '-Fp', $db],
            $descriptors,
            $dumpPipes,
            null,
            $env
        );

        if (!is_resource($dumpProc)) {
            throw new RuntimeException('Não foi possível iniciar pg_dump');
        }

        fclose($dumpPipes[0]);

        $gzipProc = proc_open(
            ['gzip'],
            [0 => $dumpPipes[1], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $gzipPipes
        );

        if (!is_resource($gzipProc)) {
            proc_close($dumpProc);
            throw new RuntimeException('Não foi possível iniciar gzip');
        }

        $gpgProc = proc_open(
            ['gpg', '--batch', '--yes', '--symmetric',
             '--cipher-algo', 'AES256',
             '--passphrase', $passphrase,
             '-o', $path],
            [0 => $gzipPipes[1], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $gpgPipes
        );

        if (!is_resource($gpgProc)) {
            proc_close($gzipProc);
            proc_close($dumpProc);
            throw new RuntimeException('Não foi possível iniciar gpg');
        }

        fclose($gpgPipes[1]);
        fclose($gpgPipes[2]);
        fclose($gzipPipes[2]);
        fclose($dumpPipes[2]);

        $gpgCode = proc_close($gpgProc);
        $gzipCode = proc_close($gzipProc);
        $dumpCode = proc_close($dumpProc);

        if ($dumpCode !== 0 || $gzipCode !== 0 || $gpgCode !== 0) {
            throw new RuntimeException(
                "Backup falhou: pg_dump={$dumpCode}, gzip={$gzipCode}, gpg={$gpgCode}"
            );
        }

        return $path;
    }

    public function pruneOld(string $type): void
    {
        $files = glob('/backups/' . $type . '/*.gpg') ?: [];
        rsort($files);

        foreach (array_slice($files, $this->retention[$type]) as $file) {
            unlink($file);
        }
    }

    private function filename(string $type): string
    {
        return match ($type) {
            'daily'   => 'vaultus_' . now()->format('Y-m-d') . '.sql.gz.gpg',
            'weekly'  => 'vaultus_' . now()->format('Y-\WW') . '.sql.gz.gpg',
            'monthly' => 'vaultus_' . now()->format('Y-m') . '.sql.gz.gpg',
        };
    }
}
```

- [ ] **Passo 5: Criar BackupDatabase command**

```php
<?php
// app/Console/Commands/BackupDatabase.php

namespace App\Console\Commands;

use App\Shared\Services\BackupService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class BackupDatabase extends Command
{
    protected $signature = 'backup:run {--type=daily : Tipo do backup (daily|weekly|monthly)}';
    protected $description = 'Realiza backup criptografado do banco de dados';

    public function handle(BackupService $backup): int
    {
        $type = $this->option('type');

        if (!in_array($type, ['daily', 'weekly', 'monthly'], true)) {
            $this->error("Tipo inválido: {$type}. Use daily, weekly ou monthly.");
            return self::FAILURE;
        }

        try {
            $path = $backup->run($type);
            $backup->pruneOld($type);
            Log::channel('backup')->info("Backup {$type} concluído: {$path}");
            $this->info("Backup salvo em: {$path}");
            return self::SUCCESS;
        } catch (\RuntimeException $e) {
            Log::channel('backup')->critical("Backup {$type} falhou: {$e->getMessage()}");
            $this->error("Backup falhou: {$e->getMessage()}");
            return self::FAILURE;
        }
    }
}
```

- [ ] **Passo 6: Adicionar canal de log em config/logging.php**

Adicionar em `'channels'`:
```php
'backup' => [
    'driver' => 'daily',
    'path' => storage_path('logs/backup.log'),
    'level' => 'info',
    'days' => 30,
],
```

- [ ] **Passo 7: Rodar testes e confirmar que passam**

```bash
docker compose run --rm app php artisan test tests/Feature/Backup/BackupCommandTest.php
```

Esperado: 4 testes passando.

- [ ] **Passo 8: Commit**

```bash
git add src/app/Shared/Services/BackupService.php \
        src/app/Console/Commands/BackupDatabase.php \
        src/config/backup.php \
        src/config/logging.php \
        src/tests/Feature/Backup/BackupCommandTest.php
git commit -m "feat: add backup service with GPG encryption, retention and Artisan command"
```

---

## Task 17: Scheduler

**Files:**
- Modificar: `src/routes/console.php`

- [ ] **Passo 1: Configurar schedule**

```php
<?php
// routes/console.php

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schedule;

Schedule::command('backup:run --type=daily')
    ->dailyAt('03:00')
    ->withoutOverlapping()
    ->onFailure(fn() => Log::channel('backup')->critical('Backup diário falhou no scheduler'));

Schedule::command('backup:run --type=weekly')
    ->weeklyOn(0, '03:30')
    ->withoutOverlapping();

Schedule::command('backup:run --type=monthly')
    ->monthlyOn(1, '04:00')
    ->withoutOverlapping();
```

- [ ] **Passo 2: Verificar jobs agendados**

```bash
docker compose run --rm app php artisan schedule:list
```

Esperado: 3 jobs listados.

- [ ] **Passo 3: Commit**

```bash
git add src/routes/console.php
git commit -m "feat: schedule automated database backups (daily/weekly/monthly)"
```

---

## Task 18: Horizon

**Files:**
- Modificar: `src/config/horizon.php`
- Modificar: `src/app/Providers/AppServiceProvider.php`

- [ ] **Passo 1: Configurar ambientes no Horizon**

Editar `src/config/horizon.php`:
```php
'environments' => [
    'production' => [
        'supervisor-1' => ['maxProcesses' => 5],
    ],
    'local' => [
        'supervisor-1' => ['maxProcesses' => 3],
    ],
],
```

- [ ] **Passo 2: Restringir acesso ao dashboard**

Em `src/app/Providers/AppServiceProvider.php`, método `boot()`:
```php
use Laravel\Horizon\Horizon;

Horizon::auth(function ($request) {
    return $request->user() !== null;
});
```

- [ ] **Passo 3: Subir Horizon e verificar**

```bash
docker compose up -d horizon
docker compose logs horizon --tail=20
```

Esperado: `Horizon started successfully` nos logs.

---

## Task 19: Frontend — Páginas de Auth

**Files:**
- Criar: `src/resources/js/Pages/Auth/Login.tsx`
- Criar: `src/resources/js/Pages/Auth/TwoFactor.tsx`
- Criar: `src/resources/js/Pages/Dashboard/Index.tsx`

- [ ] **Passo 1: Criar Login.tsx**

```tsx
// resources/js/Pages/Auth/Login.tsx
import { useForm } from '@inertiajs/react'
import { FormEvent } from 'react'

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    })

    function submit(e: FormEvent) {
        e.preventDefault()
        post('/login')
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
            <div style={{ width: 360, padding: 32, background: '#1e293b', borderRadius: 12 }}>
                <h1 style={{ color: '#f8fafc', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Vaultus</h1>
                <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>Acesse seu sistema</p>

                <form onSubmit={submit}>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', color: '#cbd5e1', fontSize: 14, marginBottom: 6 }}>Email</label>
                        <input
                            type="email"
                            value={data.email}
                            onChange={e => setData('email', e.target.value)}
                            required autoFocus
                            style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc', fontSize: 14, boxSizing: 'border-box' }}
                        />
                        {errors.email && <p style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>{errors.email}</p>}
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', color: '#cbd5e1', fontSize: 14, marginBottom: 6 }}>Senha</label>
                        <input
                            type="password"
                            value={data.password}
                            onChange={e => setData('password', e.target.value)}
                            required
                            style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc', fontSize: 14, boxSizing: 'border-box' }}
                        />
                        {errors.password && <p style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>{errors.password}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        style={{ width: '100%', padding: 12, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: processing ? 'not-allowed' : 'pointer', opacity: processing ? 0.7 : 1 }}
                    >
                        {processing ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>
            </div>
        </div>
    )
}
```

- [ ] **Passo 2: Criar TwoFactor.tsx**

```tsx
// resources/js/Pages/Auth/TwoFactor.tsx
import { useForm } from '@inertiajs/react'
import { FormEvent } from 'react'

export default function TwoFactor() {
    const { data, setData, post, processing, errors } = useForm({ code: '' })

    function submit(e: FormEvent) {
        e.preventDefault()
        post('/two-factor')
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
            <div style={{ width: 360, padding: 32, background: '#1e293b', borderRadius: 12 }}>
                <h1 style={{ color: '#f8fafc', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Verificação em 2 Fatores</h1>
                <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>
                    Abra o app autenticador e insira o código de 6 dígitos.
                </p>

                <form onSubmit={submit}>
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', color: '#cbd5e1', fontSize: 14, marginBottom: 6 }}>Código</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]{6}"
                            maxLength={6}
                            value={data.code}
                            onChange={e => setData('code', e.target.value)}
                            autoFocus
                            style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc', fontSize: 22, letterSpacing: 8, textAlign: 'center', boxSizing: 'border-box' }}
                        />
                        {errors.code && <p style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>{errors.code}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        style={{ width: '100%', padding: 12, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: processing ? 'not-allowed' : 'pointer', opacity: processing ? 0.7 : 1 }}
                    >
                        {processing ? 'Verificando...' : 'Verificar'}
                    </button>
                </form>
            </div>
        </div>
    )
}
```

- [ ] **Passo 3: Criar Dashboard/Index.tsx**

```tsx
// resources/js/Pages/Dashboard/Index.tsx
import { PageProps } from '@/types'

export default function Dashboard({ auth }: PageProps) {
    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700 }}>Olá, {auth.user?.name}</h1>
            <p style={{ color: '#94a3b8', marginTop: 8 }}>Vaultus está no ar. Módulos chegando em breve.</p>
        </div>
    )
}
```

- [ ] **Passo 4: Compilar assets**

```bash
docker compose run --rm node npm run build
```

Esperado: `public/build/` gerado sem erros TypeScript.

- [ ] **Passo 5: Commit**

```bash
git add src/resources/js/Pages/
git commit -m "feat: add Login, TwoFactor and Dashboard stub pages"
```

---

## Task 20: Verificação Final da Fase 0

- [ ] **Passo 1: Rodar suite completa de testes**

```bash
docker compose run --rm app php artisan test
```

Esperado: todos os testes passando, zero failing.

- [ ] **Passo 2: Confirmar 36 migrations rodadas**

```bash
docker compose run --rm app php artisan migrate:status | grep "Ran" | wc -l
```

Esperado: `36`

- [ ] **Passo 3: Verificar scheduler**

```bash
docker compose run --rm app php artisan schedule:list
```

Esperado: 3 jobs de backup listados.

- [ ] **Passo 4: Criar usuário e testar login manual**

```bash
docker compose run --rm app php artisan tinker --execute="
App\Domains\Auth\Models\User::create([
    'name' => 'Victor',
    'email' => 'victor@vaultus.local',
    'password' => 'senha-segura',
    'timezone' => 'America/Sao_Paulo',
]);"
```

Acessar `https://vaultus.local/login`, fazer login, confirmar redirect para `/dashboard`.

- [ ] **Passo 5: Commit final**

```bash
git add -A
git commit -m "feat: complete Phase 0 - foundation, auth with 2FA, all migrations, backup"
```

---

## Checklist de Conclusão da Fase 0

- [ ] Docker Compose com 6 serviços funcionando
- [ ] Laravel 11 + Inertia.js + React + TypeScript configurados
- [ ] 36 migrations rodando sem erro
- [ ] Login com credenciais funcionando
- [ ] Redirecionamento para 2FA quando configurado
- [ ] Verificação TOTP e autenticação após 2FA
- [ ] Rate limiting no login (5 tentativas por minuto por IP)
- [ ] Audit log registrando eventos de auth
- [ ] Tokens Sanctum para API mobile com 2FA integrado
- [ ] EncryptedCast funcionando e testado
- [ ] BackupService com GPG e retenção funcionando
- [ ] Scheduler agendando backups diário/semanal/mensal
- [ ] Horizon processando filas Redis
- [ ] Todos os testes passando
