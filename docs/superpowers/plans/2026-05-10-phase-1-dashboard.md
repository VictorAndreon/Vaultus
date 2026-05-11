# Vaultus Phase 1 — Dashboard Central (Estrutura + Layout)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o layout principal da aplicação (sidebar + topbar), estrutura de navegação entre os 10 módulos, componentes reutilizáveis base e a página de Dashboard com widgets stub. Corrigir lacunas da Fase 0 (CSP, CORS, HandleInertiaRequests, Tailwind).

**Branch de implementação:** `phase-1-dashboard` (criar a partir de `phase-0-foundation`)
**Worktree:** `.worktrees/phase-1/` (criar com `git worktree add .worktrees/phase-1 phase-1-dashboard`)

---

## Estado do Repositório ao Iniciar

### Worktree phase-0 (referência)
- **Localização:** `.worktrees/phase-0/`
- **Branch:** `phase-0-foundation`
- **Docker:** todos os serviços configurados em `.worktrees/phase-0/docker-compose.yml`

### Comandos Docker (sempre usar `sg docker` por causa do grupo)
```bash
cd .worktrees/phase-1/
sg docker -c "docker compose up -d"
sg docker -c "docker compose run --rm app php artisan ..."
sg docker -c "docker compose run --rm node npm ..."
```

### O que a Fase 0 entregou
- Laravel 11 + Inertia.js 2 + React 19 + TypeScript + Tailwind (instalado mas não configurado)
- Auth com 2FA TOTP obrigatório (`/login` → `/two-factor` → `/dashboard`)
- 36 migrations rodando, PostgreSQL 16, Redis 7
- `EncryptedCast` para campos sensíveis
- BackupService com GPG + scheduler
- Horizon configurado
- `HandleInertiaRequests` middleware com `auth.user` compartilhado
- Usuário de teste: `victor@vaultus.local` / `senha123`

### Lacunas da Fase 0 a corrigir nesta fase
1. **Tailwind** instalado mas `tailwind.config.js` e `postcss.config.js` não criados — CSS não funciona
2. **CSP** no Caddyfile tem `'unsafe-inline'` — remover após confirmar que Tailwind não precisa
3. **CORS** não configurado no `config/cors.php`
4. **`resources/js/Components/`** e **`resources/js/Layouts/`** não existem
5. **`Shared/Traits/`** (`Encryptable`, `HasAuditLog`) não criados

---

## Mapa de Arquivos

### Configuração
- Criar: `src/tailwind.config.js`
- Criar: `src/postcss.config.js`
- Modificar: `src/config/cors.php`
- Modificar: `Caddyfile` (remover `'unsafe-inline'` do CSP)

### Shared Traits
- Criar: `src/app/Shared/Traits/HasAuditLog.php`
- Criar: `src/app/Shared/Traits/Encryptable.php`

### Layout e Componentes Base
- Criar: `src/resources/js/Layouts/AppLayout.tsx`
- Criar: `src/resources/js/Components/Sidebar.tsx`
- Criar: `src/resources/js/Components/Topbar.tsx`
- Criar: `src/resources/js/Components/ui/Button.tsx`
- Criar: `src/resources/js/Components/ui/Card.tsx`
- Criar: `src/resources/js/types/index.d.ts` (expandir com tipos globais)

### Dashboard
- Modificar: `src/resources/js/Pages/Dashboard/Index.tsx` (usar layout + widgets reais)
- Criar: `src/resources/js/Pages/Dashboard/widgets/QuickStats.tsx`
- Criar: `src/resources/js/Pages/Dashboard/widgets/RecentActivity.tsx`
- Criar: `src/resources/js/Pages/Dashboard/widgets/TodayHabits.tsx`
- Criar: `src/resources/js/Pages/Dashboard/widgets/UpcomingCards.tsx`

### Backend — DashboardController
- Criar: `src/app/Domains/Dashboard/Controllers/DashboardController.php`
- Criar: `src/app/Domains/Dashboard/Services/DashboardAggregator.php`
- Modificar: `src/routes/web.php` (substituir closure pelo controller)

### Testes
- Criar: `src/tests/Feature/Dashboard/DashboardTest.php`

---

## Task 1: Corrigir Tailwind CSS

**O problema:** Tailwind 3 está em `devDependencies` mas sem `tailwind.config.js` nem `postcss.config.js`. Os utilitários não são gerados.

- [ ] **Passo 1: Criar `tailwind.config.js`**

```js
// src/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './resources/js/**/*.{tsx,ts}',
        './resources/views/**/*.blade.php',
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    50:  '#eef2ff',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                },
            },
        },
    },
    plugins: [],
}
```

- [ ] **Passo 2: Criar `postcss.config.js`**

```js
// src/postcss.config.js
export default {
    plugins: {
        tailwindcss: {},
        autoprefixer: {},
    },
}
```

- [ ] **Passo 3: Atualizar `resources/css/app.css`**

```css
/* src/resources/css/app.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Passo 4: Build e verificar**

```bash
sg docker -c "docker compose run --rm node npm run build"
```

Esperado: build sem erros, CSS com utilitários Tailwind gerados.

---

## Task 2: Corrigir CORS e CSP

- [ ] **Passo 1: Publicar e configurar `config/cors.php`**

```bash
sg docker -c "docker compose run --rm app php artisan config:publish --provider=Illuminate\\Http\\Middleware\\HandleCors"
```

Editar `src/config/cors.php`:
```php
'allowed_origins' => [env('CORS_ALLOWED_ORIGINS', 'https://vaultus.local')],
'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Inertia', 'X-Inertia-Version'],
'supports_credentials' => true,
```

- [ ] **Passo 2: Registrar CORS middleware na API**

Em `src/bootstrap/app.php`, dentro de `withMiddleware`:
```php
$middleware->api(prepend: [
    \Illuminate\Http\Middleware\HandleCors::class,
]);
```

- [ ] **Passo 3: Ajustar CSP no Caddyfile**

Remover `'unsafe-inline'` do `script-src` e `style-src` após confirmar que Tailwind compila para classes estáticas (não inline styles):
```
Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self' wss:; font-src 'self'"
```

- [ ] **Passo 4: Verificar que a UI não quebrou após mudança**

```bash
sg docker -c "docker compose restart caddy"
```

Acessar `https://vaultus.local/login` e confirmar que CSS e JS carregam sem erro no console.

---

## Task 3: Shared Traits

- [ ] **Passo 1: Criar `HasAuditLog` trait**

```php
<?php
// app/Shared/Traits/HasAuditLog.php

namespace App\Shared\Traits;

use App\Domains\Auth\Models\AuditLog;

trait HasAuditLog
{
    public function auditLogs()
    {
        return $this->morphMany(AuditLog::class, 'auditable');
    }
}
```

> Nota: requer adicionar `auditable_type/auditable_id` à tabela `audit_logs` via nova migration se quiser logs polimórficos. Por ora, o trait pode usar `user_id` diretamente como na Fase 0.

- [ ] **Passo 2: Criar `Encryptable` trait**

```php
<?php
// app/Shared/Traits/Encryptable.php

namespace App\Shared\Traits;

use App\Shared\Casts\EncryptedCast;

trait Encryptable
{
    protected function getEncryptedCasts(): array
    {
        return array_fill_keys($this->encryptable ?? [], EncryptedCast::class);
    }

    protected function casts(): array
    {
        return array_merge(
            parent::casts(),
            $this->getEncryptedCasts()
        );
    }
}
```

---

## Task 4: Layout Principal (AppLayout)

Este é o coração da Fase 1. O layout engloba sidebar com navegação por módulo e topbar com nome do usuário.

**Design:** dark slate (`#0f172a` fundo, `#1e293b` sidebar), acento indigo (`#6366f1`). Sidebar fixa de 240px no desktop, colapsável no mobile.

- [ ] **Passo 1: Criar `resources/js/Layouts/AppLayout.tsx`**

```tsx
// resources/js/Layouts/AppLayout.tsx
import { ReactNode } from 'react'
import Sidebar from '@/Components/Sidebar'
import Topbar from '@/Components/Topbar'
import { PageProps } from '@/types'
import { usePage } from '@inertiajs/react'

interface Props {
    children: ReactNode
    title?: string
}

export default function AppLayout({ children, title }: Props) {
    const { auth } = usePage<PageProps>().props

    return (
        <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 min-w-0">
                <Topbar user={auth.user} title={title} />
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
```

- [ ] **Passo 2: Criar `resources/js/Components/Sidebar.tsx`**

A sidebar lista os 10 módulos com ícones (usar SVG inline simples por ora — sem dependência de icon library).

```tsx
// resources/js/Components/Sidebar.tsx
import { Link, usePage } from '@inertiajs/react'

const NAV = [
    { label: 'Dashboard',  href: '/dashboard',  icon: '⊞' },
    { label: 'Tarefas',    href: '/tasks',       icon: '☑' },
    { label: 'Projetos',   href: '/projects',    icon: '◈' },
    { label: 'Hábitos',    href: '/habits',      icon: '◎' },
    { label: 'Diário',     href: '/journal',     icon: '✎' },
    { label: 'Finanças',   href: '/finance',     icon: '◉' },
    { label: 'Biblioteca', href: '/library',     icon: '⊟' },
    { label: 'Notas',      href: '/notes',       icon: '◻' },
    { label: 'Contatos',   href: '/contacts',    icon: '◑' },
    { label: 'Revisões',   href: '/reviews',     icon: '◷' },
]

export default function Sidebar() {
    const { url } = usePage()

    return (
        <aside className="w-60 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
            <div className="px-4 py-5 border-b border-slate-800">
                <span className="text-lg font-bold text-indigo-400 tracking-wide">Vaultus</span>
            </div>

            <nav className="flex-1 py-4 overflow-y-auto">
                {NAV.map(item => {
                    const active = url.startsWith(item.href)
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                                active
                                    ? 'bg-indigo-600/20 text-indigo-300 font-medium border-r-2 border-indigo-500'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                            }`}
                        >
                            <span className="text-base">{item.icon}</span>
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            <div className="px-4 py-3 border-t border-slate-800">
                <Link
                    href="/logout"
                    method="post"
                    as="button"
                    className="w-full text-left text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                    Sair
                </Link>
            </div>
        </aside>
    )
}
```

- [ ] **Passo 3: Criar `resources/js/Components/Topbar.tsx`**

```tsx
// resources/js/Components/Topbar.tsx
import { User } from '@/types'

interface Props {
    user: User | null
    title?: string
}

export default function Topbar({ user, title }: Props) {
    return (
        <header className="h-14 shrink-0 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center justify-between px-6">
            <h1 className="text-sm font-semibold text-slate-300">
                {title ?? 'Dashboard'}
            </h1>
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                    {user?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <span className="text-sm text-slate-400">{user?.name}</span>
            </div>
        </header>
    )
}
```

---

## Task 5: Componentes UI Base

- [ ] **Passo 1: Criar `resources/js/Components/ui/Card.tsx`**

```tsx
// resources/js/Components/ui/Card.tsx
import { ReactNode } from 'react'

interface Props {
    title?: string
    children: ReactNode
    className?: string
}

export default function Card({ title, children, className = '' }: Props) {
    return (
        <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 ${className}`}>
            {title && (
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                    {title}
                </h3>
            )}
            {children}
        </div>
    )
}
```

- [ ] **Passo 2: Criar `resources/js/Components/ui/Button.tsx`**

```tsx
// resources/js/Components/ui/Button.tsx
import { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'ghost' | 'danger'
    size?: 'sm' | 'md'
}

export default function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: Props) {
    const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors disabled:opacity-50'
    const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm' }
    const variants = {
        primary: 'bg-indigo-600 hover:bg-indigo-500 text-white',
        ghost:   'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
        danger:  'bg-red-600/20 hover:bg-red-600/30 text-red-400',
    }

    return (
        <button
            className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    )
}
```

- [ ] **Passo 3: Expandir `resources/js/types/index.d.ts`**

```typescript
// resources/js/types/index.d.ts
export interface User {
    id: number
    name: string
    email: string
    timezone: string
    two_factor_confirmed_at: string | null
}

export interface PageProps {
    auth: { user: User | null }
    flash?: { success?: string; error?: string }
}

// Tipos de domínio stub (expandidos em fases futuras)
export interface PaginatedResponse<T> {
    data: T[]
    current_page: number
    last_page: number
    per_page: number
    total: number
}
```

---

## Task 6: DashboardController + DashboardAggregator

- [ ] **Passo 1: Escrever testes**

```php
<?php
// tests/Feature/Dashboard/DashboardTest.php

namespace Tests\Feature\Dashboard;

use App\Domains\Auth\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_requires_auth(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_authenticated_user_sees_dashboard(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard/Index')
                ->has('stats')
            );
    }
}
```

- [ ] **Passo 2: Rodar e confirmar falha**

```bash
sg docker -c "docker compose run --rm app php artisan test tests/Feature/Dashboard/DashboardTest.php"
```

Esperado: FAIL — `assertInertia` falha (prop `stats` ausente)

- [ ] **Passo 3: Criar `DashboardAggregator`**

```php
<?php
// app/Domains/Dashboard/Services/DashboardAggregator.php

namespace App\Domains\Dashboard\Services;

use App\Domains\Auth\Models\User;

class DashboardAggregator
{
    public function getStats(User $user): array
    {
        // Stubs — cada fase preencherá com dados reais
        return [
            'tasks_due_today'    => 0,
            'habits_done_today'  => 0,
            'habits_total'       => 0,
            'journal_streak'     => 0,
            'open_projects'      => 0,
        ];
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

- [ ] **Passo 4: Criar `DashboardController`**

```php
<?php
// app/Domains/Dashboard/Controllers/DashboardController.php

namespace App\Domains\Dashboard\Controllers;

use App\Domains\Dashboard\Services\DashboardAggregator;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __construct(private DashboardAggregator $aggregator) {}

    public function index(Request $request)
    {
        $user = $request->user();

        return Inertia::render('Dashboard/Index', [
            'stats'           => $this->aggregator->getStats($user),
            'recent_activity' => $this->aggregator->getRecentActivity($user),
        ]);
    }
}
```

- [ ] **Passo 5: Atualizar rota do dashboard em `routes/web.php`**

```php
// Substituir a closure do dashboard por:
use App\Domains\Dashboard\Controllers\DashboardController;

Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
});
```

- [ ] **Passo 6: Rodar testes**

```bash
sg docker -c "docker compose run --rm app php artisan test tests/Feature/Dashboard/DashboardTest.php"
```

Esperado: 2 testes passando.

---

## Task 7: Dashboard Page com Widgets

- [ ] **Passo 1: Criar widget `QuickStats.tsx`**

```tsx
// resources/js/Pages/Dashboard/widgets/QuickStats.tsx
import Card from '@/Components/ui/Card'

interface Stats {
    tasks_due_today: number
    habits_done_today: number
    habits_total: number
    journal_streak: number
    open_projects: number
}

export default function QuickStats({ stats }: { stats: Stats }) {
    const items = [
        { label: 'Tarefas hoje',    value: stats.tasks_due_today,   unit: '' },
        { label: 'Hábitos',         value: `${stats.habits_done_today}/${stats.habits_total}`, unit: '' },
        { label: 'Streak diário',   value: stats.journal_streak,    unit: 'dias' },
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

- [ ] **Passo 2: Criar widget `RecentActivity.tsx`**

```tsx
// resources/js/Pages/Dashboard/widgets/RecentActivity.tsx
import Card from '@/Components/ui/Card'

interface Activity {
    event: string
    created_at: string
}

const EVENT_LABELS: Record<string, string> = {
    login:          'Login realizado',
    logout:         'Logout',
    login_failed:   'Tentativa de login falhou',
    '2fa_failed':   'Código 2FA inválido',
    api_login:      'Login via API',
}

export default function RecentActivity({ activities }: { activities: Activity[] }) {
    return (
        <Card title="Atividade Recente">
            {activities.length === 0 ? (
                <p className="text-sm text-slate-600">Nenhuma atividade registrada.</p>
            ) : (
                <ul className="space-y-2">
                    {activities.map((a, i) => (
                        <li key={i} className="flex justify-between text-sm">
                            <span className="text-slate-400">{EVENT_LABELS[a.event] ?? a.event}</span>
                            <span className="text-slate-600 text-xs">
                                {new Date(a.created_at).toLocaleString('pt-BR')}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    )
}
```

- [ ] **Passo 3: Atualizar `Pages/Dashboard/Index.tsx`**

```tsx
// resources/js/Pages/Dashboard/Index.tsx
import AppLayout from '@/Layouts/AppLayout'
import QuickStats from './widgets/QuickStats'
import RecentActivity from './widgets/RecentActivity'
import Card from '@/Components/ui/Card'

interface Props {
    stats: {
        tasks_due_today: number
        habits_done_today: number
        habits_total: number
        journal_streak: number
        open_projects: number
    }
    recent_activity: Array<{ event: string; created_at: string }>
}

export default function Dashboard({ stats, recent_activity }: Props) {
    return (
        <AppLayout title="Dashboard">
            <div className="space-y-6 max-w-6xl">
                <QuickStats stats={stats} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <RecentActivity activities={recent_activity} />

                    <Card title="Módulos">
                        <p className="text-sm text-slate-600">
                            Os widgets dos módulos aparecerão aqui conforme forem implementados.
                        </p>
                    </Card>
                </div>
            </div>
        </AppLayout>
    )
}
```

- [ ] **Passo 4: Atualizar páginas de Auth para usar AppLayout onde aplicável**

`Login.tsx` e `TwoFactor.tsx` ficam sem layout (tela cheia) — OK, não mudar.

---

## Task 8: Rotas Stub dos Módulos

Criar rotas placeholder para que os links da sidebar não quebrem com 404.

- [ ] **Passo 1: Adicionar rotas stub em `routes/web.php`**

```php
// Dentro de Route::middleware('auth')->group(...)
$stubs = ['tasks', 'projects', 'habits', 'journal', 'finance', 'library', 'notes', 'contacts', 'reviews'];

foreach ($stubs as $module) {
    Route::get("/{$module}", fn() => Inertia::render('Stub/Index', ['module' => $module]))
        ->name($module);
}
```

- [ ] **Passo 2: Criar página stub `Pages/Stub/Index.tsx`**

```tsx
// resources/js/Pages/Stub/Index.tsx
import AppLayout from '@/Layouts/AppLayout'
import Card from '@/Components/ui/Card'

interface Props { module: string }

const LABELS: Record<string, string> = {
    tasks: 'Tarefas', projects: 'Projetos', habits: 'Hábitos',
    journal: 'Diário', finance: 'Finanças', library: 'Biblioteca',
    notes: 'Notas', contacts: 'Contatos', reviews: 'Revisões',
}

export default function Stub({ module }: Props) {
    const label = LABELS[module] ?? module
    return (
        <AppLayout title={label}>
            <Card className="max-w-md">
                <p className="text-slate-500 text-sm">
                    O módulo <span className="text-slate-300 font-medium">{label}</span> será implementado em breve.
                </p>
            </Card>
        </AppLayout>
    )
}
```

---

## Task 9: Verificação Final da Fase 1

- [ ] **Passo 1: Rodar suite completa**

```bash
sg docker -c "docker compose run --rm app php artisan test"
```

Esperado: todos passando (mínimo 26 testes).

- [ ] **Passo 2: Build de produção**

```bash
sg docker -c "docker compose run --rm node npm run build"
```

Esperado: sem erros TypeScript.

- [ ] **Passo 3: Verificação visual**

Acessar `https://vaultus.local/login`, logar, confirmar:
- [ ] Sidebar com 10 módulos aparece
- [ ] Topbar com nome do usuário e avatar
- [ ] QuickStats com 4 cards mostrando zeros
- [ ] Atividade recente mostrando o último login
- [ ] Clicar em cada módulo na sidebar vai para página stub sem 404

- [ ] **Passo 4: Commit final**

```bash
git add -A
git commit -m "feat: complete Phase 1 - AppLayout, sidebar, dashboard with widgets and module stubs"
```

---

## Checklist de Conclusão da Fase 1

- [ ] Tailwind configurado e compilando corretamente
- [ ] CORS configurado para API
- [ ] CSP ajustada (sem `unsafe-inline`)
- [ ] `Encryptable` e `HasAuditLog` traits criados
- [ ] `AppLayout` com sidebar + topbar funcionando
- [ ] Componentes base: `Card`, `Button`
- [ ] `DashboardController` passando props ao Inertia
- [ ] Widgets: `QuickStats`, `RecentActivity`
- [ ] Rotas stub para todos os 10 módulos
- [ ] Todos os testes passando
- [ ] Build TypeScript sem erros

---

## Próxima fase após concluir

**Fase 2 — Hábitos + Métricas de Saúde**

Módulo com mais interdependências (alimenta o Diário com `health_metric_id`). Inclui:
- Models: `Habit`, `HabitCheckIn`, `HealthMetric`
- `StreakService` (TDD)
- CRUD de hábitos com check-in diário
- Página de métricas de saúde (humor, energia, sono, água, peso)
- Widget de hábitos no Dashboard (substituir stub)
