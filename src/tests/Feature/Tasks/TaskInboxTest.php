<?php

namespace Tests\Feature\Tasks;

use App\Domains\Auth\Models\User;
use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectColumn;
use App\Domains\Projects\Models\ProjectTask;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskInboxTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{0: Project, 1: ProjectColumn, 2: ProjectColumn}
     * Projeto com duas colunas: 'A Fazer' (pos 0) e 'Em progresso' (pos 1).
     */
    private function makeProject(User $user): array
    {
        $project = Project::create(['user_id' => $user->id, 'title' => 'P', 'status' => 'active']);
        $first   = ProjectColumn::create(['project_id' => $project->id, 'name' => 'A Fazer', 'position' => 0]);
        $second  = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Em progresso', 'position' => 1]);
        return [$project, $first, $second];
    }

    public function test_is_triaged_reflects_triaged_at(): void
    {
        $user = User::factory()->create();
        [$project, $first] = $this->makeProject($user);
        $task = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $first->id,
            'title' => 'T', 'position' => 0, 'priority' => 'low',
        ]);

        $this->assertFalse($task->isTriaged());

        $task->update(['triaged_at' => now()]);
        $this->assertTrue($task->fresh()->isTriaged());
    }

    public function test_full_create_marks_task_triaged(): void
    {
        $user = User::factory()->create();
        [$project, $first] = $this->makeProject($user);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/tasks", [
                'title'             => 'Detalhada',
                'project_column_id' => $first->id,
                'priority'          => 'high',
            ])
            ->assertRedirect();

        $task = ProjectTask::where('title', 'Detalhada')->first();
        $this->assertNotNull($task);
        $this->assertNotNull($task->triaged_at);
    }
}
