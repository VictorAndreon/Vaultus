# Phase 2 — Hábitos + Métricas de Saúde

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o módulo de hábitos completo — CRUD via drawer, check-in diário com estado otimístico, StreakService por TDD, métricas de saúde unificadas em `/habits`, e widget de hábitos no Dashboard.

**Architecture:** Inertia `router.post` com estado otimístico local no frontend. Toda ação (check-in, CRUD, métricas) passa por controllers Laravel retornando `back()` com `preserveState`/`preserveScroll` no cliente. StreakService é chamado após cada mudança de check-in.

**Tech Stack:** Laravel 11, PHP 8.4, Inertia.js 2, React 19, TypeScript, Tailwind CSS 3, Carbon, PHPUnit, Vite.

---

## Estado ao Iniciar

- **Worktree:** `.worktrees/phase-2/` (criar a partir de `phase-1-dashboard`)
- **Branch:** `phase-2-habits`
- **Docker:** `sg docker -c "docker compose up -d"` a partir de `.worktrees/phase-2/`
- **Migrations:** já existem da Fase 0 — `habits`, `habit_check_ins`, `health_metrics` — nenhuma nova necessária
- **Rota stub de `/habits`:** existe em `routes/web.php` dentro do `foreach ($stubs as $module)` — será substituída neste plano

## Comandos Docker

```bash
cd .worktrees/phase-2/
sg docker -c "docker compose up -d"
sg docker -c "docker compose run --rm app php artisan ..."
sg docker -c "docker compose run --rm node npm ..."
```

---

## Mapa de Arquivos

### Criar
| Arquivo | Responsabilidade |
|---|---|
| `src/app/Domains/Habits/Models/Habit.php` | Model com `isExpectedOn()` |
| `src/app/Domains/Habits/Models/HabitCheckIn.php` | Model simples, date cast |
| `src/app/Domains/Habits/Models/HealthMetric.php` | Model, upsert diário |
| `src/database/factories/HabitFactory.php` | Factory com states weekly/xPerWeek |
| `src/database/factories/HabitCheckInFactory.php` | Factory simples |
| `src/database/factories/HealthMetricFactory.php` | Factory simples |
| `src/app/Domains/Habits/Services/StreakService.php` | Cálculo de streak por tipo |
| `src/app/Domains/Habits/Controllers/HabitController.php` | CRUD de hábitos |
| `src/app/Domains/Habits/Controllers/CheckInController.php` | Toggle check-in diário |
| `src/app/Domains/Habits/Controllers/HealthMetricController.php` | Upsert métricas do dia |
| `src/app/Http/Resources/HabitResource.php` | Serialização para Inertia |
| `src/app/Http/Resources/HealthMetricResource.php` | Serialização para Inertia |
| `src/tests/Unit/Habits/StreakServiceTest.php` | 6 casos TDD do StreakService |
| `src/tests/Feature/Habits/HabitCrudTest.php` | Feature tests CRUD |
| `src/tests/Feature/Habits/CheckInTest.php` | Feature tests check-in |
| `src/tests/Feature/Habits/HealthMetricTest.php` | Feature tests métricas |
| `src/resources/js/Pages/Habits/Index.tsx` | Página principal `/habits` |
| `src/resources/js/Pages/Habits/components/HabitCard.tsx` | Card expansível com check-in |
| `src/resources/js/Pages/Habits/components/HabitDrawer.tsx` | Drawer criar/editar |
| `src/resources/js/Pages/Habits/components/FrequencyBadge.tsx` | Badge de frequência |
| `src/resources/js/Pages/Habits/components/StreakDisplay.tsx` | Exibição de streak |
| `src/resources/js/Pages/Habits/components/HealthMetricsPanel.tsx` | Painel de métricas |
| `src/resources/js/Pages/Dashboard/widgets/TodayHabits.tsx` | Widget hábitos do dia |

### Modificar
| Arquivo | O que muda |
|---|---|
| `src/routes/web.php` | Remover `habits` dos stubs, adicionar 7 rotas reais |
| `src/app/Domains/Dashboard/Services/DashboardAggregator.php` | Preencher stubs `habits_done_today` / `habits_total` |
| `src/resources/js/Pages/Dashboard/Index.tsx` | Usar `TodayHabits` widget |
| `src/resources/js/types/index.d.ts` | Adicionar tipos `Habit`, `HabitCheckIn`, `HealthMetric` |

---

## Task 1: Models e Factories

**Files:**
- Create: `src/app/Domains/Habits/Models/Habit.php`
- Create: `src/app/Domains/Habits/Models/HabitCheckIn.php`
- Create: `src/app/Domains/Habits/Models/HealthMetric.php`
- Create: `src/database/factories/HabitFactory.php`
- Create: `src/database/factories/HabitCheckInFactory.php`
- Create: `src/database/factories/HealthMetricFactory.php`

- [ ] **Passo 1: Criar diretórios necessários**

```bash
mkdir -p src/app/Domains/Habits/Models
mkdir -p src/app/Domains/Habits/Services
mkdir -p src/app/Domains/Habits/Controllers
mkdir -p src/app/Http/Resources
mkdir -p src/tests/Unit/Habits
mkdir -p src/tests/Feature/Habits
mkdir -p src/resources/js/Pages/Habits/components
mkdir -p src/resources/js/Pages/Dashboard/widgets
```

- [ ] **Passo 2: Criar `Habit.php`**

```php
<?php
// src/app/Domains/Habits/Models/Habit.php

namespace App\Domains\Habits\Models;

use App\Domains\Auth\Models\User;
use Carbon\CarbonInterface;
use Database\Factories\HabitFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Habit extends Model
{
    use HasFactory, SoftDeletes;

    protected static function newFactory(): HabitFactory
    {
        return HabitFactory::new();
    }

    protected $fillable = [
        'user_id', 'name', 'icon', 'frequency_type',
        'frequency_days', 'frequency_times', 'category',
        'current_streak', 'best_streak', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'frequency_days' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function checkIns()
    {
        return $this->hasMany(HabitCheckIn::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function isExpectedOn(CarbonInterface $date, string $timezone): bool
    {
        return match ($this->frequency_type) {
            'daily'      => true,
            'weekly'     => in_array($date->dayOfWeek, $this->frequency_days ?? []),
            'x_per_week' => true,
            default      => false,
        };
    }
}
```

- [ ] **Passo 3: Criar `HabitCheckIn.php`**

```php
<?php
// src/app/Domains/Habits/Models/HabitCheckIn.php

namespace App\Domains\Habits\Models;

use Database\Factories\HabitCheckInFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HabitCheckIn extends Model
{
    use HasFactory;

    protected static function newFactory(): HabitCheckInFactory
    {
        return HabitCheckInFactory::new();
    }

    protected $fillable = ['habit_id', 'date'];

    protected function casts(): array
    {
        return ['date' => 'date'];
    }

    public function habit()
    {
        return $this->belongsTo(Habit::class);
    }
}
```

- [ ] **Passo 4: Criar `HealthMetric.php`**

```php
<?php
// src/app/Domains/Habits/Models/HealthMetric.php

namespace App\Domains\Habits\Models;

use App\Domains\Auth\Models\User;
use Database\Factories\HealthMetricFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HealthMetric extends Model
{
    use HasFactory;

    protected static function newFactory(): HealthMetricFactory
    {
        return HealthMetricFactory::new();
    }

    protected $fillable = [
        'user_id', 'date', 'sleep_hours', 'weight_kg',
        'mood', 'energy', 'water_liters', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'date'        => 'date',
            'mood'        => 'integer',
            'energy'      => 'integer',
            'sleep_hours' => 'decimal:2',
            'water_liters'=> 'decimal:2',
            'weight_kg'   => 'decimal:2',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
```

- [ ] **Passo 5: Criar `HabitFactory.php`**

```php
<?php
// src/database/factories/HabitFactory.php

namespace Database\Factories;

use App\Domains\Auth\Models\User;
use App\Domains\Habits\Models\Habit;
use Illuminate\Database\Eloquent\Factories\Factory;

class HabitFactory extends Factory
{
    protected $model = Habit::class;

    public function definition(): array
    {
        return [
            'user_id'         => User::factory(),
            'name'            => fake()->words(2, true),
            'icon'            => '⭐',
            'frequency_type'  => 'daily',
            'frequency_days'  => null,
            'frequency_times' => null,
            'category'        => null,
            'current_streak'  => 0,
            'best_streak'     => 0,
            'is_active'       => true,
        ];
    }

    public function weekly(array $days = [1, 3, 5]): static
    {
        return $this->state(['frequency_type' => 'weekly', 'frequency_days' => $days]);
    }

    public function xPerWeek(int $times = 3): static
    {
        return $this->state(['frequency_type' => 'x_per_week', 'frequency_times' => $times]);
    }
}
```

- [ ] **Passo 6: Criar `HabitCheckInFactory.php`**

```php
<?php
// src/database/factories/HabitCheckInFactory.php

namespace Database\Factories;

use App\Domains\Habits\Models\Habit;
use App\Domains\Habits\Models\HabitCheckIn;
use Illuminate\Database\Eloquent\Factories\Factory;

class HabitCheckInFactory extends Factory
{
    protected $model = HabitCheckIn::class;

    public function definition(): array
    {
        return [
            'habit_id' => Habit::factory(),
            'date'     => today()->toDateString(),
        ];
    }
}
```

- [ ] **Passo 7: Criar `HealthMetricFactory.php`**

```php
<?php
// src/database/factories/HealthMetricFactory.php

namespace Database\Factories;

use App\Domains\Auth\Models\User;
use App\Domains\Habits\Models\HealthMetric;
use Illuminate\Database\Eloquent\Factories\Factory;

class HealthMetricFactory extends Factory
{
    protected $model = HealthMetric::class;

    public function definition(): array
    {
        return [
            'user_id'      => User::factory(),
            'date'         => today()->toDateString(),
            'mood'         => null,
            'energy'       => null,
            'sleep_hours'  => null,
            'water_liters' => null,
            'weight_kg'    => null,
            'notes'        => null,
        ];
    }
}
```

- [ ] **Passo 8: Verificar que os models carregam**

```bash
sg docker -c "docker compose run --rm app php artisan tinker --execute=\"echo App\Domains\Habits\Models\Habit::count();\""
```

Esperado: `0` (sem erro de namespace).

- [ ] **Passo 9: Commit**

```bash
git add src/app/Domains/Habits/Models/ src/database/factories/
git commit -m "feat: add Habit, HabitCheckIn, HealthMetric models and factories"
```

---

## Task 2: StreakService (TDD)

**Files:**
- Create: `src/app/Domains/Habits/Services/StreakService.php`
- Create: `src/tests/Unit/Habits/StreakServiceTest.php`

- [ ] **Passo 1: Criar stub do StreakService para os testes compilarem**

```php
<?php
// src/app/Domains/Habits/Services/StreakService.php

namespace App\Domains\Habits\Services;

use App\Domains\Habits\Models\Habit;

class StreakService
{
    public function recalculate(Habit $habit): void
    {
        // implementar
    }
}
```

- [ ] **Passo 2: Criar `StreakServiceTest.php` com 6 casos**

```php
<?php
// src/tests/Unit/Habits/StreakServiceTest.php

namespace Tests\Unit\Habits;

use App\Domains\Auth\Models\User;
use App\Domains\Habits\Models\Habit;
use App\Domains\Habits\Models\HabitCheckIn;
use App\Domains\Habits\Services\StreakService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StreakServiceTest extends TestCase
{
    use RefreshDatabase;

    private StreakService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new StreakService();
    }

    public function test_daily_streak_with_continuous_checkins(): void
    {
        Carbon::setTestNow('2026-05-10'); // domingo
        $user = User::factory()->create(['timezone' => 'UTC']);
        $habit = Habit::factory()->create(['user_id' => $user->id, 'frequency_type' => 'daily']);

        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-08']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-09']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-10']);

        $this->service->recalculate($habit);
        $habit->refresh();

        $this->assertEquals(3, $habit->current_streak);
        $this->assertEquals(3, $habit->best_streak);
    }

    public function test_daily_streak_broken_in_middle(): void
    {
        Carbon::setTestNow('2026-05-10');
        $user = User::factory()->create(['timezone' => 'UTC']);
        $habit = Habit::factory()->create(['user_id' => $user->id, 'frequency_type' => 'daily']);

        // May 7, 8, 10 — sem May 9
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-07']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-08']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-10']);

        $this->service->recalculate($habit);
        $habit->refresh();

        $this->assertEquals(1, $habit->current_streak);
    }

    public function test_daily_streak_does_not_penalize_today_if_not_done(): void
    {
        Carbon::setTestNow('2026-05-10');
        $user = User::factory()->create(['timezone' => 'UTC']);
        $habit = Habit::factory()->create(['user_id' => $user->id, 'frequency_type' => 'daily']);

        // May 8, 9 — sem check-in hoje ainda
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-08']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-09']);

        $this->service->recalculate($habit);
        $habit->refresh();

        $this->assertEquals(2, $habit->current_streak);
    }

    public function test_weekly_streak_with_specific_days(): void
    {
        Carbon::setTestNow('2026-05-10'); // domingo
        $user = User::factory()->create(['timezone' => 'UTC']);
        // Seg=1, Qua=3, Sex=5 em Carbon (0=dom)
        $habit = Habit::factory()->weekly([1, 3, 5])->create(['user_id' => $user->id]);

        // Semana Apr 27 - May 3: Seg Apr 27, Qua Apr 29, Sex May 1
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-04-27']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-04-29']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-01']);
        // Semana May 4 - May 10: Seg May 4, Qua May 6, Sex May 8
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-04']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-06']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-08']);

        $this->service->recalculate($habit);
        $habit->refresh();

        $this->assertEquals(6, $habit->current_streak);
    }

    public function test_x_per_week_streak_counts_complete_past_weeks(): void
    {
        Carbon::setTestNow('2026-05-10'); // domingo — semana May 4-10
        $user = User::factory()->create(['timezone' => 'UTC']);
        $habit = Habit::factory()->xPerWeek(3)->create(['user_id' => $user->id]);

        // Semana Apr 27 - May 3: 3 check-ins (completa)
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-04-27']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-04-29']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-01']);
        // Semana atual May 4-10: 2 check-ins (incompleta, não deve contar)
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-05']);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-07']);

        $this->service->recalculate($habit);
        $habit->refresh();

        $this->assertEquals(1, $habit->current_streak);
    }

    public function test_best_streak_never_decreases(): void
    {
        Carbon::setTestNow('2026-05-10');
        $user = User::factory()->create(['timezone' => 'UTC']);
        $habit = Habit::factory()->create([
            'user_id'      => $user->id,
            'frequency_type' => 'daily',
            'best_streak'  => 10,
        ]);

        // Apenas 1 check-in hoje
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-10']);

        $this->service->recalculate($habit);
        $habit->refresh();

        $this->assertEquals(1, $habit->current_streak);
        $this->assertEquals(10, $habit->best_streak);
    }
}
```

- [ ] **Passo 3: Rodar e confirmar que todos falham**

```bash
sg docker -c "docker compose run --rm app php artisan test tests/Unit/Habits/StreakServiceTest.php --no-coverage"
```

Esperado: 6 falhas (streak sempre 0, implementação vazia).

- [ ] **Passo 4: Implementar `StreakService`**

```php
<?php
// src/app/Domains/Habits/Services/StreakService.php

namespace App\Domains\Habits\Services;

use App\Domains\Habits\Models\Habit;
use Carbon\Carbon;

class StreakService
{
    public function recalculate(Habit $habit): void
    {
        $habit->loadMissing('user');
        $timezone = $habit->user->timezone;
        $today = Carbon::now($timezone)->startOfDay();

        if ($habit->frequency_type === 'x_per_week') {
            $this->recalculateWeeklyStreak($habit, $today);
        } else {
            $this->recalculateDailyStreak($habit, $today, $timezone);
        }
    }

    private function recalculateDailyStreak(Habit $habit, Carbon $today, string $timezone): void
    {
        $checkIns = $habit->checkIns()
            ->orderByDesc('date')
            ->pluck('date')
            ->mapWithKeys(fn($date) => [
                Carbon::parse($date)->toDateString() => true,
            ]);

        if ($checkIns->isEmpty()) {
            $habit->update(['current_streak' => 0, 'best_streak' => $habit->best_streak]);
            return;
        }

        $date = $today->copy();

        // Não penaliza hoje se ainda não foi feito
        if ($habit->isExpectedOn($date, $timezone) && ! $checkIns->has($date->toDateString())) {
            $date->subDay();
        }

        $earliest = Carbon::parse($checkIns->keys()->last());
        $streak = 0;

        while ($date->gte($earliest)) {
            if ($habit->isExpectedOn($date, $timezone)) {
                if ($checkIns->has($date->toDateString())) {
                    $streak++;
                } else {
                    break;
                }
            }
            $date->subDay();
        }

        $best = max($habit->best_streak, $streak);
        $habit->update(['current_streak' => $streak, 'best_streak' => $best]);
    }

    private function recalculateWeeklyStreak(Habit $habit, Carbon $today): void
    {
        $checkIns = $habit->checkIns()
            ->pluck('date')
            ->map(fn($d) => Carbon::parse($d));

        if ($checkIns->isEmpty()) {
            $habit->update(['current_streak' => 0, 'best_streak' => $habit->best_streak]);
            return;
        }

        // Semana atual começa na segunda
        $currentWeekStart = $today->copy()->startOfWeek(Carbon::MONDAY);
        // Começar da semana anterior (semana atual pode estar incompleta)
        $weekStart = $currentWeekStart->copy()->subWeek();
        $earliest = $checkIns->min()->copy()->startOfWeek(Carbon::MONDAY);
        $streak = 0;

        while ($weekStart->gte($earliest)) {
            $weekEnd = $weekStart->copy()->addDays(6);
            $count = $checkIns->filter(
                fn($d) => $d->between($weekStart, $weekEnd)
            )->count();

            if ($count >= $habit->frequency_times) {
                $streak++;
            } else {
                break;
            }

            $weekStart->subWeek();
        }

        $best = max($habit->best_streak, $streak);
        $habit->update(['current_streak' => $streak, 'best_streak' => $best]);
    }
}
```

- [ ] **Passo 5: Rodar testes e confirmar que todos passam**

```bash
sg docker -c "docker compose run --rm app php artisan test tests/Unit/Habits/StreakServiceTest.php --no-coverage"
```

Esperado: 6 testes passando.

- [ ] **Passo 6: Commit**

```bash
git add src/app/Domains/Habits/Services/StreakService.php src/tests/Unit/Habits/StreakServiceTest.php
git commit -m "feat: implement StreakService with TDD (daily, weekly, x_per_week)"
```

---

## Task 3: HabitController + Feature Tests (TDD)

**Files:**
- Create: `src/app/Domains/Habits/Controllers/HabitController.php`
- Create: `src/app/Http/Resources/HabitResource.php`
- Create: `src/app/Http/Resources/HealthMetricResource.php`
- Create: `src/tests/Feature/Habits/HabitCrudTest.php`
- Create: `src/resources/js/Pages/Habits/Index.tsx` (stub mínimo para `assertInertia`)
- Modify: `src/routes/web.php`

- [ ] **Passo 1: Criar stub mínimo de `Habits/Index.tsx` (necessário para `assertInertia`)**

```tsx
// src/resources/js/Pages/Habits/Index.tsx
export default function Habits({ habits, today_metrics, today }: any) {
    return <div>Habits</div>
}
```

- [ ] **Passo 2: Criar `HabitCrudTest.php`**

```php
<?php
// src/tests/Feature/Habits/HabitCrudTest.php

namespace Tests\Feature\Habits;

use App\Domains\Auth\Models\User;
use App\Domains\Habits\Models\Habit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HabitCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_habits_page_requires_auth(): void
    {
        $this->get('/habits')->assertRedirect('/login');
    }

    public function test_habits_page_renders_with_correct_props(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/habits')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Habits/Index')
                ->has('habits')
                ->has('today_metrics')
                ->has('today')
            );
    }

    public function test_can_create_daily_habit(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/habits', [
                'name'           => 'Meditar',
                'icon'           => '🧘',
                'frequency_type' => 'daily',
                'category'       => 'Bem-estar',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('habits', [
            'user_id'        => $user->id,
            'name'           => 'Meditar',
            'frequency_type' => 'daily',
        ]);
    }

    public function test_can_create_weekly_habit(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/habits', [
                'name'            => 'Musculação',
                'frequency_type'  => 'weekly',
                'frequency_days'  => [1, 3, 5],
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('habits', [
            'user_id'        => $user->id,
            'frequency_type' => 'weekly',
        ]);
    }

    public function test_can_create_x_per_week_habit(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/habits', [
                'name'            => 'Correr',
                'frequency_type'  => 'x_per_week',
                'frequency_times' => 3,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('habits', [
            'user_id'         => $user->id,
            'frequency_times' => 3,
        ]);
    }

    public function test_can_update_habit(): void
    {
        $user = User::factory()->create();
        $habit = Habit::factory()->create(['user_id' => $user->id, 'name' => 'Antigo']);

        $this->actingAs($user)
            ->patch("/habits/{$habit->id}", ['name' => 'Novo Nome'])
            ->assertRedirect();

        $this->assertDatabaseHas('habits', ['id' => $habit->id, 'name' => 'Novo Nome']);
    }

    public function test_can_soft_delete_habit(): void
    {
        $user = User::factory()->create();
        $habit = Habit::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->delete("/habits/{$habit->id}")
            ->assertRedirect();

        $this->assertSoftDeleted('habits', ['id' => $habit->id]);
    }

    public function test_cannot_modify_other_users_habit(): void
    {
        $owner  = User::factory()->create();
        $other  = User::factory()->create();
        $habit  = Habit::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($other)
            ->patch("/habits/{$habit->id}", ['name' => 'Hackeado'])
            ->assertForbidden();
    }
}
```

- [ ] **Passo 3: Rodar e confirmar falhas (rotas não existem ainda)**

```bash
sg docker -c "docker compose run --rm app php artisan test tests/Feature/Habits/HabitCrudTest.php --no-coverage"
```

Esperado: falhas por 404 / componente não encontrado.

- [ ] **Passo 4: Criar `HabitResource.php`**

```php
<?php
// src/app/Http/Resources/HabitResource.php

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HabitResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $today = Carbon::now($request->user()?->timezone ?? 'UTC')->toDateString();

        return [
            'id'                   => $this->id,
            'name'                 => $this->name,
            'icon'                 => $this->icon,
            'frequency_type'       => $this->frequency_type,
            'frequency_days'       => $this->frequency_days,
            'frequency_times'      => $this->frequency_times,
            'category'             => $this->category,
            'current_streak'       => $this->current_streak,
            'best_streak'          => $this->best_streak,
            'is_active'            => $this->is_active,
            'checked_in_today'     => $this->whenLoaded('checkIns', fn() =>
                $this->checkIns->contains(fn($ci) => $ci->date->toDateString() === $today)
            ),
            'recent_check_ins'     => $this->whenLoaded('checkIns', fn() =>
                $this->checkIns->map(fn($ci) => $ci->date->toDateString())->values()
            ),
            'week_check_ins_count' => $this->when(
                $this->frequency_type === 'x_per_week',
                fn() => $this->whenLoaded('checkIns', fn() =>
                    $this->checkIns->filter(fn($ci) =>
                        $ci->date->gte(Carbon::now()->startOfWeek(Carbon::MONDAY))
                    )->count()
                )
            ),
        ];
    }
}
```

- [ ] **Passo 5: Criar `HealthMetricResource.php`**

```php
<?php
// src/app/Http/Resources/HealthMetricResource.php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HealthMetricResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'date'         => $this->date->toDateString(),
            'mood'         => $this->mood,
            'energy'       => $this->energy,
            'sleep_hours'  => $this->sleep_hours,
            'water_liters' => $this->water_liters,
            'weight_kg'    => $this->weight_kg,
            'notes'        => $this->notes,
        ];
    }
}
```

- [ ] **Passo 6: Criar `HabitController.php`**

```php
<?php
// src/app/Domains/Habits/Controllers/HabitController.php

namespace App\Domains\Habits\Controllers;

use App\Domains\Habits\Models\Habit;
use App\Domains\Habits\Models\HealthMetric;
use App\Http\Resources\HabitResource;
use App\Http\Resources\HealthMetricResource;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;

class HabitController extends Controller
{
    public function index(Request $request)
    {
        $user  = $request->user();
        $today = Carbon::now($user->timezone)->toDateString();
        $weekStart = Carbon::now($user->timezone)->startOfWeek(Carbon::MONDAY)->toDateString();

        $habits = $user->habits()
            ->active()
            ->with(['checkIns' => fn($q) => $q->where('date', '>=',
                Carbon::now($user->timezone)->subDays(6)->toDateString()
            )])
            ->get();

        $todayMetric = HealthMetric::where('user_id', $user->id)
            ->whereDate('date', $today)
            ->first();

        return Inertia::render('Habits/Index', [
            'habits'        => HabitResource::collection($habits),
            'today_metrics' => $todayMetric ? HealthMetricResource::make($todayMetric) : null,
            'today'         => $today,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'            => 'required|string|max:255',
            'icon'            => 'nullable|string|max:10',
            'frequency_type'  => 'required|in:daily,weekly,x_per_week',
            'frequency_days'  => 'required_if:frequency_type,weekly|array',
            'frequency_days.*'=> 'integer|min:0|max:6',
            'frequency_times' => 'required_if:frequency_type,x_per_week|integer|min:1|max:7',
            'category'        => 'nullable|string|max:100',
        ]);

        $request->user()->habits()->create($validated);

        return back();
    }

    public function update(Request $request, Habit $habit)
    {
        abort_if($habit->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'name'            => 'sometimes|string|max:255',
            'icon'            => 'nullable|string|max:10',
            'frequency_type'  => 'sometimes|in:daily,weekly,x_per_week',
            'frequency_days'  => 'sometimes|nullable|array',
            'frequency_days.*'=> 'integer|min:0|max:6',
            'frequency_times' => 'sometimes|nullable|integer|min:1|max:7',
            'category'        => 'nullable|string|max:100',
            'is_active'       => 'sometimes|boolean',
        ]);

        $habit->update($validated);

        return back();
    }

    public function destroy(Request $request, Habit $habit)
    {
        abort_if($habit->user_id !== $request->user()->id, 403);

        $habit->delete();

        return back();
    }
}
```

- [ ] **Passo 7: Adicionar User `habits()` relationship**

Editar `src/app/Domains/Auth/Models/User.php`, adicionar após `auditLogs()`:

```php
public function habits()
{
    return $this->hasMany(\App\Domains\Habits\Models\Habit::class);
}
```

- [ ] **Passo 8: Atualizar `routes/web.php`**

Substituir o conteúdo completo:

```php
<?php

use App\Domains\Auth\Controllers\AuthController;
use App\Domains\Auth\Controllers\TwoFactorController;
use App\Domains\Dashboard\Controllers\DashboardController;
use App\Domains\Habits\Controllers\CheckInController;
use App\Domains\Habits\Controllers\HabitController;
use App\Domains\Habits\Controllers\HealthMetricController;
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

    $stubs = ['tasks', 'projects', 'journal', 'finance', 'library', 'notes', 'contacts', 'reviews'];
    foreach ($stubs as $module) {
        Route::get("/{$module}", fn() => Inertia::render('Stub/Index', ['module' => $module]))->name($module);
    }
});
```

- [ ] **Passo 9: Rodar testes e confirmar que passam**

```bash
sg docker -c "docker compose run --rm app php artisan test tests/Feature/Habits/HabitCrudTest.php --no-coverage"
```

Esperado: 7 testes passando.

- [ ] **Passo 10: Commit**

```bash
git add src/app/Domains/Habits/Controllers/HabitController.php \
        src/app/Http/Resources/ \
        src/app/Domains/Auth/Models/User.php \
        src/routes/web.php \
        src/resources/js/Pages/Habits/Index.tsx \
        src/tests/Feature/Habits/HabitCrudTest.php
git commit -m "feat: add HabitController with CRUD and feature tests"
```

---

## Task 4: CheckInController (TDD)

**Files:**
- Create: `src/app/Domains/Habits/Controllers/CheckInController.php`
- Create: `src/tests/Feature/Habits/CheckInTest.php`

- [ ] **Passo 1: Criar `CheckInTest.php`**

```php
<?php
// src/tests/Feature/Habits/CheckInTest.php

namespace Tests\Feature\Habits;

use App\Domains\Auth\Models\User;
use App\Domains\Habits\Models\Habit;
use App\Domains\Habits\Models\HabitCheckIn;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckInTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_check_in_today(): void
    {
        Carbon::setTestNow('2026-05-10');
        $user  = User::factory()->create(['timezone' => 'UTC']);
        $habit = Habit::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->post("/habits/{$habit->id}/check-in")
            ->assertRedirect();

        $this->assertDatabaseHas('habit_check_ins', [
            'habit_id' => $habit->id,
            'date'     => '2026-05-10',
        ]);
    }

    public function test_can_remove_checkin_today(): void
    {
        Carbon::setTestNow('2026-05-10');
        $user  = User::factory()->create(['timezone' => 'UTC']);
        $habit = Habit::factory()->create(['user_id' => $user->id]);
        HabitCheckIn::factory()->create(['habit_id' => $habit->id, 'date' => '2026-05-10']);

        $this->actingAs($user)
            ->delete("/habits/{$habit->id}/check-in")
            ->assertRedirect();

        $this->assertDatabaseMissing('habit_check_ins', [
            'habit_id' => $habit->id,
            'date'     => '2026-05-10',
        ]);
    }

    public function test_checkin_updates_streak(): void
    {
        Carbon::setTestNow('2026-05-10');
        $user  = User::factory()->create(['timezone' => 'UTC']);
        $habit = Habit::factory()->create(['user_id' => $user->id, 'current_streak' => 0]);

        $this->actingAs($user)->post("/habits/{$habit->id}/check-in");

        $this->assertEquals(1, $habit->fresh()->current_streak);
    }

    public function test_cannot_checkin_other_users_habit(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $habit = Habit::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($other)
            ->post("/habits/{$habit->id}/check-in")
            ->assertForbidden();
    }
}
```

- [ ] **Passo 2: Rodar e confirmar falhas**

```bash
sg docker -c "docker compose run --rm app php artisan test tests/Feature/Habits/CheckInTest.php --no-coverage"
```

Esperado: 4 falhas (controller não existe).

- [ ] **Passo 3: Criar `CheckInController.php`**

```php
<?php
// src/app/Domains/Habits/Controllers/CheckInController.php

namespace App\Domains\Habits\Controllers;

use App\Domains\Habits\Models\Habit;
use App\Domains\Habits\Services\StreakService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class CheckInController extends Controller
{
    public function __construct(private StreakService $streakService) {}

    public function store(Request $request, Habit $habit)
    {
        abort_if($habit->user_id !== $request->user()->id, 403);

        $today = Carbon::now($request->user()->timezone)->toDateString();

        $habit->checkIns()->firstOrCreate(['date' => $today]);

        $this->streakService->recalculate($habit);

        return back();
    }

    public function destroy(Request $request, Habit $habit)
    {
        abort_if($habit->user_id !== $request->user()->id, 403);

        $today = Carbon::now($request->user()->timezone)->toDateString();

        $habit->checkIns()->whereDate('date', $today)->delete();

        $this->streakService->recalculate($habit);

        return back();
    }
}
```

- [ ] **Passo 4: Rodar testes e confirmar que passam**

```bash
sg docker -c "docker compose run --rm app php artisan test tests/Feature/Habits/CheckInTest.php --no-coverage"
```

Esperado: 4 testes passando.

- [ ] **Passo 5: Commit**

```bash
git add src/app/Domains/Habits/Controllers/CheckInController.php src/tests/Feature/Habits/CheckInTest.php
git commit -m "feat: add CheckInController with StreakService integration"
```

---

## Task 5: HealthMetricController (TDD)

**Files:**
- Create: `src/app/Domains/Habits/Controllers/HealthMetricController.php`
- Create: `src/tests/Feature/Habits/HealthMetricTest.php`

- [ ] **Passo 1: Criar `HealthMetricTest.php`**

```php
<?php
// src/tests/Feature/Habits/HealthMetricTest.php

namespace Tests\Feature\Habits;

use App\Domains\Auth\Models\User;
use App\Domains\Habits\Models\HealthMetric;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HealthMetricTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_save_health_metrics(): void
    {
        Carbon::setTestNow('2026-05-10');
        $user = User::factory()->create(['timezone' => 'UTC']);

        $this->actingAs($user)
            ->post('/habits/health-metrics', [
                'mood'         => 4,
                'energy'       => 3,
                'sleep_hours'  => 7.5,
                'water_liters' => 2.0,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('health_metrics', [
            'user_id' => $user->id,
            'date'    => '2026-05-10',
            'mood'    => 4,
            'energy'  => 3,
        ]);
    }

    public function test_saving_metrics_twice_updates_existing(): void
    {
        Carbon::setTestNow('2026-05-10');
        $user = User::factory()->create(['timezone' => 'UTC']);
        HealthMetric::factory()->create(['user_id' => $user->id, 'date' => '2026-05-10', 'mood' => 2]);

        $this->actingAs($user)
            ->post('/habits/health-metrics', ['mood' => 5])
            ->assertRedirect();

        $this->assertDatabaseCount('health_metrics', 1);
        $this->assertDatabaseHas('health_metrics', ['user_id' => $user->id, 'mood' => 5]);
    }

    public function test_health_metrics_require_auth(): void
    {
        $this->post('/habits/health-metrics', ['mood' => 3])->assertRedirect('/login');
    }
}
```

- [ ] **Passo 2: Rodar e confirmar falhas**

```bash
sg docker -c "docker compose run --rm app php artisan test tests/Feature/Habits/HealthMetricTest.php --no-coverage"
```

Esperado: 3 falhas.

- [ ] **Passo 3: Criar `HealthMetricController.php`**

```php
<?php
// src/app/Domains/Habits/Controllers/HealthMetricController.php

namespace App\Domains\Habits\Controllers;

use App\Domains\Habits\Models\HealthMetric;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class HealthMetricController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'mood'         => 'nullable|integer|min:1|max:5',
            'energy'       => 'nullable|integer|min:1|max:5',
            'sleep_hours'  => 'nullable|numeric|min:0|max:24',
            'water_liters' => 'nullable|numeric|min:0|max:20',
            'weight_kg'    => 'nullable|numeric|min:0|max:500',
            'notes'        => 'nullable|string|max:1000',
        ]);

        $today = Carbon::now($request->user()->timezone)->toDateString();

        HealthMetric::updateOrCreate(
            ['user_id' => $request->user()->id, 'date' => $today],
            $validated
        );

        return back()->with('success', 'Métricas salvas.');
    }
}
```

- [ ] **Passo 4: Rodar testes e confirmar que passam**

```bash
sg docker -c "docker compose run --rm app php artisan test tests/Feature/Habits/HealthMetricTest.php --no-coverage"
```

Esperado: 3 testes passando.

- [ ] **Passo 5: Rodar suite completa para garantir regressões zero**

```bash
sg docker -c "docker compose run --rm app php artisan test --no-coverage"
```

Esperado: ≥ 39 testes passando (26 existentes + 13 novos).

- [ ] **Passo 6: Commit**

```bash
git add src/app/Domains/Habits/Controllers/HealthMetricController.php src/tests/Feature/Habits/HealthMetricTest.php
git commit -m "feat: add HealthMetricController with upsert logic"
```

---

## Task 6: Tipos TypeScript

**Files:**
- Modify: `src/resources/js/types/index.d.ts`

- [ ] **Passo 1: Atualizar `types/index.d.ts`**

```typescript
// src/resources/js/types/index.d.ts

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

export interface PaginatedResponse<T> {
    data: T[]
    current_page: number
    last_page: number
    per_page: number
    total: number
}

export type FrequencyType = 'daily' | 'weekly' | 'x_per_week'

export interface Habit {
    id: number
    name: string
    icon: string | null
    frequency_type: FrequencyType
    frequency_days: number[] | null    // 0=dom ... 6=sab
    frequency_times: number | null
    category: string | null
    current_streak: number
    best_streak: number
    is_active: boolean
    checked_in_today: boolean
    recent_check_ins: string[]         // array de 'YYYY-MM-DD'
    week_check_ins_count: number | null // só para x_per_week
}

export interface HealthMetric {
    id: number
    date: string
    mood: number | null
    energy: number | null
    sleep_hours: string | null
    water_liters: string | null
    weight_kg: string | null
    notes: string | null
}
```

- [ ] **Passo 2: Commit**

```bash
git add src/resources/js/types/index.d.ts
git commit -m "feat: add Habit, HealthMetric TypeScript types"
```

---

## Task 7: FrequencyBadge + StreakDisplay

**Files:**
- Create: `src/resources/js/Pages/Habits/components/FrequencyBadge.tsx`
- Create: `src/resources/js/Pages/Habits/components/StreakDisplay.tsx`

- [ ] **Passo 1: Criar `FrequencyBadge.tsx`**

```tsx
// src/resources/js/Pages/Habits/components/FrequencyBadge.tsx
import { FrequencyType } from '@/types'

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

interface Props {
    frequencyType: FrequencyType
    frequencyDays?: number[] | null
    frequencyTimes?: number | null
}

export default function FrequencyBadge({ frequencyType, frequencyDays, frequencyTimes }: Props) {
    const label = () => {
        if (frequencyType === 'daily') return 'Diário'
        if (frequencyType === 'x_per_week') return `${frequencyTimes}× / semana`
        if (frequencyType === 'weekly' && frequencyDays?.length) {
            return frequencyDays.map(d => DAY_LABELS[d]).join(' · ')
        }
        return 'Semanal'
    }

    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-400">
            {label()}
        </span>
    )
}
```

- [ ] **Passo 2: Criar `StreakDisplay.tsx`**

```tsx
// src/resources/js/Pages/Habits/components/StreakDisplay.tsx
import { FrequencyType } from '@/types'

interface Props {
    currentStreak: number
    bestStreak: number
    frequencyType: FrequencyType
}

export default function StreakDisplay({ currentStreak, bestStreak, frequencyType }: Props) {
    const unit = frequencyType === 'x_per_week' ? 'semanas' : 'dias'

    return (
        <div className="flex items-center gap-4 text-sm">
            <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-indigo-400">{currentStreak}</span>
                <span className="text-xs text-slate-500">{unit} atual</span>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-slate-400">{bestStreak}</span>
                <span className="text-xs text-slate-500">melhor</span>
            </div>
        </div>
    )
}
```

- [ ] **Passo 3: Commit**

```bash
git add src/resources/js/Pages/Habits/components/FrequencyBadge.tsx \
        src/resources/js/Pages/Habits/components/StreakDisplay.tsx
git commit -m "feat: add FrequencyBadge and StreakDisplay components"
```

---

## Task 8: HealthMetricsPanel

**Files:**
- Create: `src/resources/js/Pages/Habits/components/HealthMetricsPanel.tsx`

- [ ] **Passo 1: Criar `HealthMetricsPanel.tsx`**

```tsx
// src/resources/js/Pages/Habits/components/HealthMetricsPanel.tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'
import { HealthMetric } from '@/types'
import Card from '@/Components/ui/Card'
import Button from '@/Components/ui/Button'

interface Props {
    todayMetrics: HealthMetric | null
}

const MOOD_LABELS = ['', '😞', '😕', '😐', '🙂', '😊']
const ENERGY_LABELS = ['', '🪫', '😴', '⚡', '🔋', '🚀']

export default function HealthMetricsPanel({ todayMetrics }: Props) {
    const [open, setOpen] = useState(!todayMetrics)
    const [form, setForm] = useState({
        mood:         todayMetrics?.mood         ?? 3,
        energy:       todayMetrics?.energy       ?? 3,
        sleep_hours:  todayMetrics?.sleep_hours  ?? '',
        water_liters: todayMetrics?.water_liters ?? '',
        weight_kg:    todayMetrics?.weight_kg    ?? '',
        notes:        todayMetrics?.notes        ?? '',
    })

    const save = () => {
        router.post('/habits/health-metrics', form, {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
        })
    }

    return (
        <Card>
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between text-left"
            >
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Métricas do Dia
                </span>
                <span className="text-slate-500 text-sm">{open ? '▲' : '▼'}</span>
            </button>

            {open && (
                <div className="mt-4 space-y-4">
                    {/* Mood */}
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Humor</label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(v => (
                                <button
                                    key={v}
                                    onClick={() => setForm(f => ({ ...f, mood: v }))}
                                    className={`text-xl p-1 rounded transition-opacity ${
                                        form.mood === v ? 'opacity-100' : 'opacity-30'
                                    }`}
                                >
                                    {MOOD_LABELS[v]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Energy */}
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Energia</label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(v => (
                                <button
                                    key={v}
                                    onClick={() => setForm(f => ({ ...f, energy: v }))}
                                    className={`text-xl p-1 rounded transition-opacity ${
                                        form.energy === v ? 'opacity-100' : 'opacity-30'
                                    }`}
                                >
                                    {ENERGY_LABELS[v]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Numeric fields */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { key: 'sleep_hours',  label: 'Sono (h)',  step: '0.5' },
                            { key: 'water_liters', label: 'Água (L)',  step: '0.1' },
                            { key: 'weight_kg',    label: 'Peso (kg)', step: '0.1' },
                        ].map(({ key, label, step }) => (
                            <div key={key}>
                                <label className="text-xs text-slate-500 block mb-1">{label}</label>
                                <input
                                    type="number"
                                    step={step}
                                    min="0"
                                    value={(form as any)[key]}
                                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="—"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Notas</label>
                        <textarea
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            rows={2}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                            placeholder="Como foi o dia..."
                        />
                    </div>

                    <Button onClick={save} size="sm">Salvar métricas</Button>
                </div>
            )}
        </Card>
    )
}
```

- [ ] **Passo 2: Commit**

```bash
git add src/resources/js/Pages/Habits/components/HealthMetricsPanel.tsx
git commit -m "feat: add HealthMetricsPanel component"
```

---

## Task 9: HabitCard

**Files:**
- Create: `src/resources/js/Pages/Habits/components/HabitCard.tsx`

- [ ] **Passo 1: Criar `HabitCard.tsx`**

```tsx
// src/resources/js/Pages/Habits/components/HabitCard.tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Habit } from '@/types'
import FrequencyBadge from './FrequencyBadge'
import StreakDisplay from './StreakDisplay'
import Button from '@/Components/ui/Button'

interface Props {
    habit: Habit
    today: string
    onEdit: (habit: Habit) => void
}

export default function HabitCard({ habit, today, onEdit }: Props) {
    const [expanded, setExpanded] = useState(false)
    const [checkedIn, setCheckedIn] = useState(habit.checked_in_today)

    const toggle = () => {
        const wasChecked = checkedIn
        setCheckedIn(!wasChecked)

        const url = `/habits/${habit.id}/check-in`
        const method = wasChecked ? 'delete' : 'post'

        router[method](url, {}, {
            preserveState: true,
            preserveScroll: true,
            onError: () => setCheckedIn(wasChecked), // reverte se erro
        })
    }

    const archive = () => {
        router.delete(`/habits/${habit.id}`, {}, {
            preserveScroll: true,
        })
    }

    // Mini-calendário: últimos 7 dias
    const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today)
        d.setDate(d.getDate() - (6 - i))
        return d.toISOString().split('T')[0]
    })

    return (
        <div className={`bg-slate-900 border rounded-xl transition-colors ${
            checkedIn ? 'border-indigo-500/40' : 'border-slate-800'
        }`}>
            {/* Header */}
            <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                onClick={() => setExpanded(e => !e)}
            >
                <span className="text-xl">{habit.icon ?? '⭐'}</span>
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                        checkedIn ? 'text-slate-300 line-through decoration-indigo-500' : 'text-slate-200'
                    }`}>
                        {habit.name}
                    </p>
                    <div className="mt-0.5">
                        <FrequencyBadge
                            frequencyType={habit.frequency_type}
                            frequencyDays={habit.frequency_days}
                            frequencyTimes={habit.frequency_times}
                        />
                    </div>
                </div>
                <button
                    onClick={e => { e.stopPropagation(); toggle() }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                        checkedIn
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                    }`}
                >
                    {checkedIn ? '✓' : '○'}
                </button>
            </div>

            {/* Expanded content */}
            {expanded && (
                <div className="px-4 pb-4 border-t border-slate-800 pt-4 space-y-4">
                    <StreakDisplay
                        currentStreak={habit.current_streak}
                        bestStreak={habit.best_streak}
                        frequencyType={habit.frequency_type}
                    />

                    {/* Mini-calendário 7 dias */}
                    <div className="flex gap-1.5">
                        {last7.map(date => (
                            <div key={date} className="flex flex-col items-center gap-1">
                                <div className={`w-6 h-6 rounded-full ${
                                    habit.recent_check_ins.includes(date)
                                        ? 'bg-indigo-600'
                                        : date === today
                                        ? 'bg-slate-700 ring-1 ring-indigo-500'
                                        : 'bg-slate-800'
                                }`} />
                                <span className="text-xs text-slate-600">
                                    {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'narrow' })}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Progresso semanal para x_per_week */}
                    {habit.frequency_type === 'x_per_week' && habit.frequency_times && (
                        <div>
                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                <span>Esta semana</span>
                                <span>{habit.week_check_ins_count ?? 0}/{habit.frequency_times}</span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-600 rounded-full transition-all"
                                    style={{
                                        width: `${Math.min(100, ((habit.week_check_ins_count ?? 0) / habit.frequency_times) * 100)}%`
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(habit)}>
                            Editar
                        </Button>
                        <Button variant="danger" size="sm" onClick={archive}>
                            Arquivar
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
```

- [ ] **Passo 2: Commit**

```bash
git add src/resources/js/Pages/Habits/components/HabitCard.tsx
git commit -m "feat: add HabitCard component with optimistic check-in"
```

---

## Task 10: HabitDrawer

**Files:**
- Create: `src/resources/js/Pages/Habits/components/HabitDrawer.tsx`

- [ ] **Passo 1: Criar `HabitDrawer.tsx`**

```tsx
// src/resources/js/Pages/Habits/components/HabitDrawer.tsx
import { useState, useEffect } from 'react'
import { router } from '@inertiajs/react'
import { Habit, FrequencyType } from '@/types'
import Button from '@/Components/ui/Button'

interface Props {
    habit: Habit | null   // null = criar novo
    onClose: () => void
}

const DAY_OPTIONS = [
    { value: 0, label: 'Dom' },
    { value: 1, label: 'Seg' },
    { value: 2, label: 'Ter' },
    { value: 3, label: 'Qua' },
    { value: 4, label: 'Qui' },
    { value: 5, label: 'Sex' },
    { value: 6, label: 'Sab' },
]

export default function HabitDrawer({ habit, onClose }: Props) {
    const isEditing = !!habit

    const [form, setForm] = useState({
        name:            habit?.name            ?? '',
        icon:            habit?.icon            ?? '',
        category:        habit?.category        ?? '',
        frequency_type:  (habit?.frequency_type ?? 'daily') as FrequencyType,
        frequency_days:  habit?.frequency_days  ?? [] as number[],
        frequency_times: habit?.frequency_times ?? 3,
    })

    useEffect(() => {
        if (habit) {
            setForm({
                name:            habit.name,
                icon:            habit.icon ?? '',
                category:        habit.category ?? '',
                frequency_type:  habit.frequency_type,
                frequency_days:  habit.frequency_days ?? [],
                frequency_times: habit.frequency_times ?? 3,
            })
        }
    }, [habit])

    const toggleDay = (day: number) => {
        setForm(f => ({
            ...f,
            frequency_days: f.frequency_days.includes(day)
                ? f.frequency_days.filter(d => d !== day)
                : [...f.frequency_days, day].sort((a, b) => a - b),
        }))
    }

    const submit = () => {
        const payload = {
            name:            form.name,
            icon:            form.icon || null,
            category:        form.category || null,
            frequency_type:  form.frequency_type,
            frequency_days:  form.frequency_type === 'weekly' ? form.frequency_days : null,
            frequency_times: form.frequency_type === 'x_per_week' ? form.frequency_times : null,
        }

        if (isEditing) {
            router.patch(`/habits/${habit.id}`, payload, {
                preserveScroll: true,
                onSuccess: onClose,
            })
        } else {
            router.post('/habits', payload, {
                preserveScroll: true,
                onSuccess: onClose,
            })
        }
    }

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/50 z-40"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-80 bg-slate-900 border-l border-slate-800 z-50 flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                    <h2 className="text-sm font-semibold text-slate-200">
                        {isEditing ? 'Editar hábito' : 'Novo hábito'}
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg">×</button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* Nome */}
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Nome *</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="Ex: Meditar"
                        />
                    </div>

                    {/* Ícone */}
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Ícone (emoji)</label>
                        <input
                            type="text"
                            value={form.icon}
                            onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                            maxLength={2}
                            className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-center text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="⭐"
                        />
                    </div>

                    {/* Categoria */}
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Categoria</label>
                        <input
                            type="text"
                            value={form.category}
                            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="Ex: Saúde, Estudo..."
                        />
                    </div>

                    {/* Frequência */}
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Frequência *</label>
                        <select
                            value={form.frequency_type}
                            onChange={e => setForm(f => ({ ...f, frequency_type: e.target.value as FrequencyType }))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="daily">Diário</option>
                            <option value="weekly">Dias específicos</option>
                            <option value="x_per_week">X vezes por semana</option>
                        </select>
                    </div>

                    {/* Dias da semana */}
                    {form.frequency_type === 'weekly' && (
                        <div>
                            <label className="text-xs text-slate-500 block mb-2">Dias</label>
                            <div className="flex gap-1.5 flex-wrap">
                                {DAY_OPTIONS.map(({ value, label }) => (
                                    <button
                                        key={value}
                                        onClick={() => toggleDay(value)}
                                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                            form.frequency_days.includes(value)
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Vezes por semana */}
                    {form.frequency_type === 'x_per_week' && (
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Vezes por semana</label>
                            <input
                                type="number"
                                min="1"
                                max="7"
                                value={form.frequency_times}
                                onChange={e => setForm(f => ({ ...f, frequency_times: Number(e.target.value) }))}
                                className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                    )}
                </div>

                <div className="px-5 py-4 border-t border-slate-800">
                    <Button onClick={submit} className="w-full" disabled={!form.name.trim()}>
                        {isEditing ? 'Salvar alterações' : 'Criar hábito'}
                    </Button>
                </div>
            </div>
        </>
    )
}
```

- [ ] **Passo 2: Commit**

```bash
git add src/resources/js/Pages/Habits/components/HabitDrawer.tsx
git commit -m "feat: add HabitDrawer component for create/edit"
```

---

## Task 11: Habits/Index.tsx (página principal)

**Files:**
- Modify: `src/resources/js/Pages/Habits/Index.tsx` (substituir stub)

- [ ] **Passo 1: Substituir stub pelo `Index.tsx` completo**

```tsx
// src/resources/js/Pages/Habits/Index.tsx
import { useState } from 'react'
import AppLayout from '@/Layouts/AppLayout'
import { Habit, HealthMetric } from '@/types'
import HabitCard from './components/HabitCard'
import HabitDrawer from './components/HabitDrawer'
import HealthMetricsPanel from './components/HealthMetricsPanel'
import Button from '@/Components/ui/Button'

interface Props {
    habits: Habit[]
    today_metrics: HealthMetric | null
    today: string
}

export default function HabitsIndex({ habits, today_metrics, today }: Props) {
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null)

    const openCreate = () => {
        setEditingHabit(null)
        setDrawerOpen(true)
    }

    const openEdit = (habit: Habit) => {
        setEditingHabit(habit)
        setDrawerOpen(true)
    }

    const closeDrawer = () => {
        setDrawerOpen(false)
        setEditingHabit(null)
    }

    return (
        <AppLayout title="Hábitos">
            <div className="max-w-2xl space-y-4">
                <HealthMetricsPanel todayMetrics={today_metrics} />

                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                        Seus hábitos
                    </h2>
                    <Button size="sm" onClick={openCreate}>+ Novo hábito</Button>
                </div>

                {habits.length === 0 ? (
                    <div className="text-center py-12 text-slate-600 text-sm">
                        Nenhum hábito ainda.{' '}
                        <button
                            onClick={openCreate}
                            className="text-indigo-400 hover:text-indigo-300"
                        >
                            Criar o primeiro
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {habits.map(habit => (
                            <HabitCard
                                key={habit.id}
                                habit={habit}
                                today={today}
                                onEdit={openEdit}
                            />
                        ))}
                    </div>
                )}
            </div>

            {drawerOpen && (
                <HabitDrawer habit={editingHabit} onClose={closeDrawer} />
            )}
        </AppLayout>
    )
}
```

- [ ] **Passo 2: Commit**

```bash
git add src/resources/js/Pages/Habits/Index.tsx
git commit -m "feat: implement Habits/Index page with drawer and health panel"
```

---

## Task 12: Dashboard — TodayHabits Widget + DashboardAggregator

**Files:**
- Create: `src/resources/js/Pages/Dashboard/widgets/TodayHabits.tsx`
- Modify: `src/app/Domains/Dashboard/Services/DashboardAggregator.php`
- Modify: `src/resources/js/Pages/Dashboard/Index.tsx`

- [ ] **Passo 1: Criar `TodayHabits.tsx`**

```tsx
// src/resources/js/Pages/Dashboard/widgets/TodayHabits.tsx
import { Link } from '@inertiajs/react'
import Card from '@/Components/ui/Card'

interface HabitSummary {
    id: number
    name: string
    icon: string | null
    checked_in_today: boolean
}

interface Props {
    habits_today: HabitSummary[]
    done: number
    total: number
}

export default function TodayHabits({ habits_today, done, total }: Props) {
    return (
        <Card title="Hábitos Hoje">
            {total === 0 ? (
                <p className="text-sm text-slate-600">
                    <Link href="/habits" className="text-indigo-400 hover:text-indigo-300">
                        Criar hábitos
                    </Link>
                </p>
            ) : (
                <>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-slate-400">{done}/{total} concluídos</span>
                        <Link href="/habits" className="text-xs text-indigo-400 hover:text-indigo-300">
                            Ver todos →
                        </Link>
                    </div>
                    <ul className="space-y-1.5">
                        {habits_today.slice(0, 5).map(h => (
                            <li key={h.id} className="flex items-center gap-2 text-sm">
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                                    h.checked_in_today ? 'bg-indigo-600' : 'bg-slate-800'
                                }`}>
                                    {h.checked_in_today ? '✓' : ''}
                                </span>
                                <span className="text-slate-500 text-sm">{h.icon}</span>
                                <span className={h.checked_in_today ? 'text-slate-500 line-through' : 'text-slate-300'}>
                                    {h.name}
                                </span>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </Card>
    )
}
```

- [ ] **Passo 2: Atualizar `DashboardAggregator.php`**

```php
<?php
// src/app/Domains/Dashboard/Services/DashboardAggregator.php

namespace App\Domains\Dashboard\Services;

use App\Domains\Auth\Models\User;
use App\Domains\Habits\Models\Habit;
use App\Domains\Habits\Models\HabitCheckIn;
use Carbon\Carbon;

class DashboardAggregator
{
    public function getStats(User $user): array
    {
        $today     = Carbon::now($user->timezone)->toDateString();
        $weekStart = Carbon::now($user->timezone)->startOfWeek(Carbon::MONDAY)->toDateString();

        $activeHabits = $user->habits()->active()->with('checkIns')->get();

        $expectedToday = $activeHabits->filter(
            fn($h) => $h->isExpectedOn(Carbon::now($user->timezone), $user->timezone)
        );

        $doneToday = $expectedToday->filter(
            fn($h) => $h->checkIns->contains(fn($ci) => $ci->date->toDateString() === $today)
        );

        return [
            'tasks_due_today'   => 0,
            'habits_done_today' => $doneToday->count(),
            'habits_total'      => $expectedToday->count(),
            'journal_streak'    => 0,
            'open_projects'     => 0,
        ];
    }

    public function getHabitsToday(User $user): array
    {
        $today = Carbon::now($user->timezone)->toDateString();

        return $user->habits()
            ->active()
            ->with(['checkIns' => fn($q) => $q->whereDate('date', $today)])
            ->get()
            ->filter(fn($h) => $h->isExpectedOn(Carbon::now($user->timezone), $user->timezone))
            ->map(fn($h) => [
                'id'              => $h->id,
                'name'            => $h->name,
                'icon'            => $h->icon,
                'checked_in_today'=> $h->checkIns->isNotEmpty(),
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

- [ ] **Passo 3: Atualizar `DashboardController.php` para passar `habits_today`**

Editar `src/app/Domains/Dashboard/Controllers/DashboardController.php`:

```php
<?php

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
            'habits_today'    => $this->aggregator->getHabitsToday($user),
        ]);
    }
}
```

- [ ] **Passo 4: Atualizar `Dashboard/Index.tsx`**

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
        journal_streak: number
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

- [ ] **Passo 5: Commit**

```bash
git add src/resources/js/Pages/Dashboard/widgets/TodayHabits.tsx \
        src/app/Domains/Dashboard/Services/DashboardAggregator.php \
        src/app/Domains/Dashboard/Controllers/DashboardController.php \
        src/resources/js/Pages/Dashboard/Index.tsx
git commit -m "feat: add TodayHabits dashboard widget with real habit data"
```

---

## Task 13: Verificação Final

- [ ] **Passo 1: Rodar suite completa de testes**

```bash
sg docker -c "docker compose run --rm app php artisan test --no-coverage"
```

Esperado: ≥ 39 testes passando (0 falhas).

- [ ] **Passo 2: Build de produção TypeScript**

```bash
sg docker -c "docker compose run --rm node npm run build"
```

Esperado: build sem erros TypeScript.

- [ ] **Passo 3: Verificação visual**

Acessar `https://vaultus.local/habits` e confirmar:
- [ ] `HealthMetricsPanel` aberto por padrão (sem métricas hoje)
- [ ] "Nenhum hábito ainda" com link para criar
- [ ] Criar hábito "Meditar" (diário) — aparece na lista
- [ ] Check-in no hábito — botão muda para `✓`, borda indigo
- [ ] Expandir card — mostra streak, mini-calendário, botões editar/arquivar
- [ ] Editar hábito via drawer — nome atualiza na lista
- [ ] Acessar `/dashboard` — TodayHabits mostra hábito com status

- [ ] **Passo 4: Commit final (se houver arquivos não commitados)**

```bash
git status
git add -A  # apenas arquivos pendentes não commitados acima
git commit -m "feat: complete Phase 2 - habits module with streak, check-in and health metrics"
```

---

## Checklist de Conclusão da Fase 2

- [ ] Models `Habit`, `HabitCheckIn`, `HealthMetric` com factories
- [ ] `StreakService` com TDD (6 unit tests passando)
- [ ] `HabitController` CRUD com feature tests
- [ ] `CheckInController` toggle com StreakService
- [ ] `HealthMetricController` upsert diário
- [ ] Rota `/habits/health-metrics` definida ANTES de `/habits/{habit}`
- [ ] Frontend: `FrequencyBadge`, `StreakDisplay`, `HealthMetricsPanel`, `HabitCard`, `HabitDrawer`, `Index.tsx`
- [ ] Widget `TodayHabits` no Dashboard com dados reais
- [ ] `DashboardAggregator` com `habits_done_today` e `habits_total` reais
- [ ] ≥ 39 testes passando
- [ ] Build TypeScript sem erros

---

## Próxima Fase

**Fase 3 — Diário**

- `JournalEntry` com FK para `HealthMetric` (já preparada no schema)
- Editor de texto (Markdown simples ou `contenteditable`)
- Pré-preenchimento de humor/energia a partir do `health_metric_id` do dia
- Prompts diários, streaks de escrita, exportação
