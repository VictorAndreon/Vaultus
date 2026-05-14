<?php

namespace Tests\Feature\Tasks;

use App\Domains\Auth\Models\User;
use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectColumn;
use App\Domains\Projects\Models\ProjectTask;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TasksTest extends TestCase
{
    use RefreshDatabase;

    public function test_tasks_page_requires_auth(): void
    {
        $this->get('/tasks')->assertRedirect('/login');
    }

    public function test_tasks_page_renders_with_correct_props(): void
    {
        $user    = User::factory()->create();
        $project = Project::create(['user_id' => $user->id, 'title' => 'Atelier', 'status' => 'active']);
        $col     = ProjectColumn::create(['project_id' => $project->id, 'name' => 'A fazer', 'position' => 1]);

        ProjectTask::create([
            'project_id'        => $project->id,
            'project_column_id' => $col->id,
            'title'             => 'Revisar proposta',
            'priority'          => 'high',
            'due_at'            => now(),
            'position'          => 1,
        ]);

        $this->actingAs($user)
            ->get('/tasks')
            ->assertStatus(200)
            ->assertInertia(fn($page) => $page
                ->component('Tasks/Index')
                ->has('tasks')
                ->has('stats')
                ->has('by_project')
            );
    }

    public function test_tasks_are_grouped_correctly(): void
    {
        $user    = User::factory()->create();
        $project = Project::create(['user_id' => $user->id, 'title' => 'P', 'status' => 'active']);
        $col     = ProjectColumn::create(['project_id' => $project->id, 'name' => 'A fazer', 'position' => 1]);

        // Task today
        ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $col->id,
            'title' => 'Hoje task', 'due_at' => now(), 'position' => 1,
        ]);
        // Task this week
        ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $col->id,
            'title' => 'Semana task', 'due_at' => now()->addDays(3), 'position' => 2,
        ]);

        $this->actingAs($user)
            ->get('/tasks')
            ->assertInertia(fn($page) => $page
                ->has('tasks', 2)
            );
    }
}
