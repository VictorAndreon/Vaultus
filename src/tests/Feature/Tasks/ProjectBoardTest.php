<?php

namespace Tests\Feature\Tasks;

use App\Domains\Auth\Models\User;
use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectColumn;
use App\Domains\Projects\Models\ProjectTask;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectBoardTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_exposes_projects_board(): void
    {
        $user = User::factory()->create();
        $project = Project::create(['user_id' => $user->id, 'title' => 'Alpha', 'status' => 'active']);
        $todo = ProjectColumn::create(['project_id' => $project->id, 'name' => 'A Fazer', 'position' => 0]);
        $done = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Concluído', 'position' => 1]);
        ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $todo->id,
            'title' => 'Pendente', 'position' => 0, 'priority' => 'high',
        ]);
        ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $done->id,
            'title' => 'Pronta', 'position' => 0, 'priority' => 'low',
        ]);

        $this->actingAs($user)
            ->get('/tasks')
            ->assertInertia(fn ($page) => $page
                ->component('Tasks/Index')
                ->where('projects_board.0.title', 'Alpha')
                ->where('projects_board.0.columns.0.name', 'A Fazer')
                ->where('projects_board.0.columns.0.tasks.0.title', 'Pendente')
                ->where('projects_board.0.columns.0.tasks.0.is_done', false)
                ->where('projects_board.0.columns.1.tasks.0.is_done', true)
            );
    }

    public function test_projects_board_excludes_other_users(): void
    {
        $user  = User::factory()->create();
        $other = User::factory()->create();
        Project::create(['user_id' => $other->id, 'title' => 'Alheio', 'status' => 'active']);

        $this->actingAs($user)
            ->get('/tasks')
            ->assertInertia(fn ($page) => $page
                ->component('Tasks/Index')
                ->where('projects_board', [])
            );
    }
}
