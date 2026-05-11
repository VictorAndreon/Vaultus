# Vaultus Phase 2 — Hábitos + Métricas de Saúde

**Data:** 2026-05-10
**Escopo:** Módulo de hábitos com CRUD, check-in diário, StreakService e métricas de saúde integradas na mesma página. Widget de hábitos no Dashboard.

---

## 1. Decisões de Design

| Decisão | Escolha | Motivo |
|---|---|---|
| Arquitetura de ações | Inertia `router.post` + estado otimístico local | Sem duplicar rotas/auth; UX ágil com `preserveState`/`preserveScroll` |
| Localização das métricas | Painel na página `/habits` | Dados do mesmo dia — faz sentido estarem juntos |
| Check-in UX | Cards expandíveis | Mostra streak e histórico sem trocar de página |
| CRUD de hábitos | Drawer lateral (modal) | Fluxo rápido sem abandonar a lista |
| Streak `x_per_week` | Semanas ISO consecutivas | Semanticamente correto para metas semanais |
| Streak `daily`/`weekly` | Dias consecutivos esperados | Padrão esperado para hábitos com dias fixos |

---

## 2. Banco de Dados

As três migrations já existem da Fase 0. Nenhuma migration nova é necessária.

### `habits`
| Coluna | Tipo | Notas |
|---|---|---|
| `frequency_type` | `varchar(20)` | `'daily'`, `'weekly'`, `'x_per_week'` |
| `frequency_days` | `jsonb` | Array int 0–6 (dom–sab); usado quando `weekly` |
| `frequency_times` | `int` | Usado quando `x_per_week` |
| `current_streak` | `int` | Mantido pelo `StreakService` após cada check-in |
| `best_streak` | `int` | Atualizado quando `current_streak > best_streak` |

### `habit_check_ins`
Unique em `(habit_id, date)`. Registro = check-in feito. Ausência = não feito.

### `health_metrics`
Unique em `(user_id, date)`. Um registro por dia. Todos os campos são nullable — usuário pode preencher apenas o que quiser.

---

## 3. Models

### `Habit` — `app/Domains/Habits/Models/Habit.php`
- `fillable`: `name`, `icon`, `frequency_type`, `frequency_days`, `frequency_times`, `category`, `is_active`
- Cast: `frequency_days` → `array`
- Relações: `hasMany(HabitCheckIn)`, `belongsTo(User)`
- Método `isExpectedOn(CarbonInterface $date, string $timezone): bool` — retorna true se o hábito deve ser feito na data fornecida (usada tanto para "hoje" quanto pelo StreakService ao iterar retroativamente):
  - `daily`: sempre true
  - `weekly`: verifica se o dia da semana da `$date` (no timezone do usuário) está em `frequency_days`
  - `x_per_week`: sempre true (pode ser feito qualquer dia)
- Scope `active()`: filtra `is_active = true`

### `HabitCheckIn` — `app/Domains/Habits/Models/HabitCheckIn.php`
- `fillable`: `habit_id`, `date`
- Cast: `date` → `date`
- Relação: `belongsTo(Habit)`

### `HealthMetric` — `app/Domains/Habits/Models/HealthMetric.php`
- `fillable`: `user_id`, `date`, `sleep_hours`, `weight_kg`, `mood`, `energy`, `water_liters`, `notes`
- Cast: `date` → `date`, `mood`/`energy` → `integer`
- Relação: `belongsTo(User)`
- `mood` e `energy`: escala 1–5

---

## 4. StreakService

`app/Domains/Habits/Services/StreakService.php`

### Interface pública
```php
public function recalculate(Habit $habit): void
```

Recalcula e persiste `current_streak` e `best_streak` no model. Chamado após qualquer check-in ou remoção de check-in.

### Lógica por tipo

**`daily` e `weekly`** — streak em dias:
1. Obtém timezone do usuário via `$habit->user->timezone`
2. Parte do "hoje" no timezone do usuário e vai retroativamente
3. Para cada dia esperado (conforme `isExpectedToday` com data retroativa), verifica se existe check-in
4. Para ao encontrar o primeiro dia esperado sem check-in
5. Conta de "ontem" para trás (não penaliza se hoje ainda não foi feito)

**`x_per_week`** — streak em semanas ISO:
1. Agrupa check-ins por semana ISO (`ISOWEEK`)
2. Parte da semana atual e vai retroativamente
3. Para cada semana, verifica se `count(check-ins) >= frequency_times`
4. Não penaliza a semana corrente se ainda não terminou
5. Conta semanas consecutivas completas

### Invariante
`best_streak = max(best_streak, current_streak)` — nunca decresce.

---

## 5. Controllers e Rotas

### `HabitController` — `app/Domains/Habits/Controllers/HabitController.php`

| Método | Rota | Descrição |
|---|---|---|
| `index` | `GET /habits` | Renderiza `Habits/Index` com props |
| `store` | `POST /habits` | Cria hábito; redireciona de volta |
| `update` | `PATCH /habits/{habit}` | Atualiza hábito; redireciona de volta |
| `destroy` | `DELETE /habits/{habit}` | Soft delete; redireciona de volta |

**Props do `index`:**
```php
[
    'habits'         => HabitResource::collection(...),  // com check-ins dos últimos 7 dias
    'today_metrics'  => HealthMetricResource::make(...) | null,
    'today'          => now()->tz($user->timezone)->toDateString(),
]
```

Eager loading em `index`: `habits()->with(['checkIns' => fn($q) => $q->where('date', '>=', now()->subDays(6)->toDateString())])`

### `CheckInController` — `app/Domains/Habits/Controllers/CheckInController.php`

| Método | Rota | Descrição |
|---|---|---|
| `store` | `POST /habits/{habit}/check-in` | Cria check-in para hoje; chama StreakService |
| `destroy` | `DELETE /habits/{habit}/check-in` | Remove check-in de hoje; chama StreakService |

Ambos retornam `back()` — Inertia recarrega a página preservando estado.

### `HealthMetricController` — `app/Domains/Habits/Controllers/HealthMetricController.php`

| Método | Rota | Descrição |
|---|---|---|
| `store` | `POST /habits/health-metrics` | `updateOrCreate(['user_id', 'date'], [...campos])` |

Retorna `back()` com flash de sucesso.

### Autorização
Todos os controllers verificam `$habit->user_id === auth()->id()` — sem Policy formal nesta fase (sistema single-user).

---

## 6. Frontend

### Estrutura de arquivos
```
resources/js/Pages/Habits/
├── Index.tsx
└── components/
    ├── HabitCard.tsx
    ├── HabitDrawer.tsx
    ├── FrequencyBadge.tsx
    ├── StreakDisplay.tsx
    └── HealthMetricsPanel.tsx
```

### `Index.tsx`
- Recebe `habits`, `today_metrics`, `today`
- Renderiza `HealthMetricsPanel` no topo (colapsado se `today_metrics` já preenchido)
- Renderiza lista de `HabitCard` abaixo
- Gerencia `drawerOpen: boolean` e `editingHabit: Habit | null` para o drawer
- Botão flutuante "Novo hábito" no rodapé da lista

### `HabitCard.tsx`
- Estado local: `expanded: boolean`, `optimisticChecked: boolean`
- `optimisticChecked` inicializado a partir de props (se já existe check-in hoje)
- Ao clicar no botão de check-in: atualiza `optimisticChecked` imediatamente, depois chama `router.post/delete` com `preserveState: true, preserveScroll: true`
- Expandido mostra:
  - `StreakDisplay` com streak atual e melhor streak
  - Mini-calendário 7 dias (bolinhas)
  - Para `x_per_week`: barra de progresso "N/M esta semana"
  - Botões "Editar" e "Arquivar" no rodapé

### `HabitDrawer.tsx`
- Drawer lateral (panel deslizante da direita)
- Campos: nome, ícone (input texto emoji), categoria, tipo de frequência
- Campos condicionais: se `weekly` → checkboxes dom/seg/ter/qua/qui/sex/sab; se `x_per_week` → número input
- Submit via `router.post` (criar) ou `router.patch` (editar)

### `FrequencyBadge.tsx`
- Badge pequeno: "Diário" | "Seg · Qua · Sex" | "3× / semana"

### `StreakDisplay.tsx`
- Label contextual: "X dias" para daily/weekly, "X semanas" para x_per_week
- Exibe atual e melhor streak

### `HealthMetricsPanel.tsx`
- Colapsável com chevron
- Sliders 1–5 para humor e energia (com labels: 😞→😊)
- Inputs numéricos para sono (horas), água (litros), peso (kg) — todos opcionais
- Textarea para notas
- Botão "Salvar" via `router.post('/habits/health-metrics', {...}, { preserveScroll: true })`

---

## 7. Widget do Dashboard

Substituir stub em `DashboardAggregator` e criar `TodayHabits.tsx`:

**Backend** — `DashboardAggregator::getStats()`:
```php
'habits_done_today' => HabitCheckIn::whereDate('date', today())->whereHas('habit', fn($q) => $q->where('user_id', $user->id))->count(),
'habits_total'      => $user->habits()->active()->where(fn($q) => /* isExpectedToday logic */)->count(),
```

**Frontend** — `Pages/Dashboard/widgets/TodayHabits.tsx`:
- Card com lista de hábitos esperados hoje
- Cada item mostra nome + ícone + status (feito/não feito)
- Link "Ver todos" para `/habits`

---

## 8. Testes

### `tests/Feature/Habits/HabitCrudTest.php`
- Criar hábito (daily, weekly, x_per_week)
- Editar hábito
- Soft delete

### `tests/Feature/Habits/CheckInTest.php`
- Marcar check-in
- Desmarcar check-in
- Duplo check-in no mesmo dia retorna erro (unique constraint)

### `tests/Feature/Habits/HealthMetricTest.php`
- Criar métrica do dia
- Atualizar métrica existente (upsert)

### `tests/Unit/Habits/StreakServiceTest.php`
- Streak `daily` com sequência contínua
- Streak `daily` quebrado no meio
- Streak `weekly` com dias específicos
- Streak `x_per_week` com semanas consecutivas completas
- Streak `x_per_week` com semana incompleta (não penaliza semana atual)
- `best_streak` nunca decresce

---

## 9. Integração com Diário (Fase 3)

`health_metrics.id` já é referenciado por `journal_entries.health_metric_id`. Na Fase 2, ao salvar métricas do dia, o sistema **não** cria automaticamente a entrada do diário — apenas o registro de `health_metrics` é salvo. A Fase 3 do Diário usará essa FK para pré-preencher humor/energia ao abrir uma entrada do dia.

---

## 10. Mapa de Arquivos a Criar/Modificar

### Criar
- `src/app/Domains/Habits/Models/Habit.php`
- `src/app/Domains/Habits/Models/HabitCheckIn.php`
- `src/app/Domains/Habits/Models/HealthMetric.php`
- `src/app/Domains/Habits/Services/StreakService.php`
- `src/app/Domains/Habits/Controllers/HabitController.php`
- `src/app/Domains/Habits/Controllers/CheckInController.php`
- `src/app/Domains/Habits/Controllers/HealthMetricController.php`
- `src/app/Http/Resources/HabitResource.php`
- `src/app/Http/Resources/HealthMetricResource.php`
- `src/resources/js/Pages/Habits/Index.tsx`
- `src/resources/js/Pages/Habits/components/HabitCard.tsx`
- `src/resources/js/Pages/Habits/components/HabitDrawer.tsx`
- `src/resources/js/Pages/Habits/components/FrequencyBadge.tsx`
- `src/resources/js/Pages/Habits/components/StreakDisplay.tsx`
- `src/resources/js/Pages/Habits/components/HealthMetricsPanel.tsx`
- `src/resources/js/Pages/Dashboard/widgets/TodayHabits.tsx`
- `src/tests/Feature/Habits/HabitCrudTest.php`
- `src/tests/Feature/Habits/CheckInTest.php`
- `src/tests/Feature/Habits/HealthMetricTest.php`
- `src/tests/Unit/Habits/StreakServiceTest.php`

### Modificar
- `src/routes/web.php` (adicionar rotas de hábitos)
- `src/app/Domains/Dashboard/Services/DashboardAggregator.php` (preencher stubs)
- `src/resources/js/Pages/Dashboard/Index.tsx` (usar TodayHabits widget)
- `src/resources/js/types/index.d.ts` (adicionar tipos Habit, HabitCheckIn, HealthMetric)
