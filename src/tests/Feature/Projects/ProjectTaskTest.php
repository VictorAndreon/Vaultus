<?php

namespace Tests\Feature\Projects;

use App\Domains\Auth\Models\User;
use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectColumn;
use App\Domains\Projects\Models\ProjectTask;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectTaskTest extends TestCase
{
    use RefreshDatabase;

    private function makeProjectWithColumn(User $user): array
    {
        $project = Project::create(['user_id' => $user->id, 'title' => 'P', 'status' => 'active']);
        $column  = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Todo', 'position' => 0]);
        return [$project, $column];
    }

    public function test_can_create_task(): void
    {
        $user = User::factory()->create();
        [$project, $column] = $this->makeProjectWithColumn($user);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/tasks", [
                'title'             => 'Minha tarefa',
                'project_column_id' => $column->id,
                'priority'          => 'medium',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('project_tasks', [
            'project_id'        => $project->id,
            'project_column_id' => $column->id,
            'title'             => 'Minha tarefa',
        ]);
    }

    public function test_can_update_task(): void
    {
        $user = User::factory()->create();
        [$project, $column] = $this->makeProjectWithColumn($user);
        $task = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $column->id,
            'title' => 'Old', 'position' => 0, 'priority' => 'low',
        ]);

        $this->actingAs($user)
            ->patch("/projects/tasks/{$task->id}", ['title' => 'New'])
            ->assertRedirect();

        $this->assertDatabaseHas('project_tasks', ['id' => $task->id, 'title' => 'New']);
    }

    public function test_can_delete_task(): void
    {
        $user = User::factory()->create();
        [$project, $column] = $this->makeProjectWithColumn($user);
        $task = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $column->id,
            'title' => 'Del', 'position' => 0, 'priority' => 'low',
        ]);

        $this->actingAs($user)
            ->delete("/projects/tasks/{$task->id}")
            ->assertRedirect();

        $this->assertSoftDeleted('project_tasks', ['id' => $task->id]);
    }

    public function test_can_move_task_to_another_column(): void
    {
        $user = User::factory()->create();
        [$project, $col1] = $this->makeProjectWithColumn($user);
        $col2 = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Done', 'position' => 1]);
        $task = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $col1->id,
            'title' => 'T', 'position' => 0, 'priority' => 'low',
        ]);

        $this->actingAs($user)
            ->patch("/projects/tasks/{$task->id}/move", [
                'project_column_id' => $col2->id,
                'position'          => 0,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('project_tasks', [
            'id'                => $task->id,
            'project_column_id' => $col2->id,
            'position'          => 0,
        ]);
    }

    public function test_cannot_modify_other_users_task(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        [$project, $column] = $this->makeProjectWithColumn($user1);
        $task = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $column->id,
            'title' => 'T', 'position' => 0, 'priority' => 'low',
        ]);

        $this->actingAs($user2)->patch("/projects/tasks/{$task->id}", ['title' => 'Hack'])->assertForbidden();
        $this->actingAs($user2)->delete("/projects/tasks/{$task->id}")->assertForbidden();
        $this->actingAs($user2)->patch("/projects/tasks/{$task->id}/move", ['project_column_id' => $column->id, 'position' => 0])->assertForbidden();
    }
}
