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

    public function test_quick_capture_creates_untriaged_task_in_first_column(): void
    {
        $user = User::factory()->create();
        [$project, $first, $second] = $this->makeProject($user);

        $this->actingAs($user)
            ->post('/tasks/capture', ['title' => 'Capturada', 'project_id' => $project->id])
            ->assertRedirect();

        $task = ProjectTask::where('title', 'Capturada')->first();
        $this->assertNotNull($task);
        $this->assertNull($task->triaged_at);
        $this->assertSame($first->id, $task->project_column_id);
        $this->assertSame('medium', $task->priority);
    }

    public function test_cannot_capture_into_other_users_project(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        [$project] = $this->makeProject($owner);

        $this->actingAs($other)
            ->post('/tasks/capture', ['title' => 'X', 'project_id' => $project->id])
            ->assertNotFound();
    }

    public function test_triage_sets_triaged_at_and_applies_fields(): void
    {
        $user = User::factory()->create();
        [$project, $first, $second] = $this->makeProject($user);
        $task = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $first->id,
            'title' => 'T', 'position' => 0, 'priority' => 'low',
        ]);

        $this->actingAs($user)
            ->patch("/projects/tasks/{$task->id}/triage", [
                'due_at'            => '2026-06-10',
                'priority'          => 'high',
                'project_column_id' => $second->id,
            ])
            ->assertRedirect();

        $task->refresh();
        $this->assertNotNull($task->triaged_at);
        $this->assertSame('high', $task->priority);
        $this->assertNotNull($task->due_at);
        $this->assertSame($second->id, $task->project_column_id);
    }

    public function test_triage_rejects_column_from_other_project(): void
    {
        $user = User::factory()->create();
        [$projectA, $firstA] = $this->makeProject($user);
        $projectB = Project::create(['user_id' => $user->id, 'title' => 'B', 'status' => 'active']);
        $columnB  = ProjectColumn::create(['project_id' => $projectB->id, 'name' => 'Todo B', 'position' => 0]);
        $task = ProjectTask::create([
            'project_id' => $projectA->id, 'project_column_id' => $firstA->id,
            'title' => 'T', 'position' => 0, 'priority' => 'low',
        ]);

        $this->actingAs($user)
            ->patch("/projects/tasks/{$task->id}/triage", ['project_column_id' => $columnB->id])
            ->assertSessionHasErrors('project_column_id');

        $this->assertNull($task->fresh()->triaged_at);
    }

    public function test_cannot_triage_other_users_task(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        [$project, $first] = $this->makeProject($owner);
        $task = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $first->id,
            'title' => 'T', 'position' => 0, 'priority' => 'low',
        ]);

        $this->actingAs($other)
            ->patch("/projects/tasks/{$task->id}/triage", ['priority' => 'high'])
            ->assertForbidden();
    }

    public function test_move_out_of_first_column_marks_triaged(): void
    {
        $user = User::factory()->create();
        [$project, $first, $second] = $this->makeProject($user);
        $task = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $first->id,
            'title' => 'T', 'position' => 0, 'priority' => 'low',
        ]);

        $this->actingAs($user)
            ->patch("/projects/tasks/{$task->id}/move", [
                'project_column_id' => $second->id,
                'position'          => 0,
            ])
            ->assertRedirect();

        $this->assertNotNull($task->fresh()->triaged_at);
    }

    public function test_move_back_to_first_column_keeps_triaged(): void
    {
        $user = User::factory()->create();
        [$project, $first, $second] = $this->makeProject($user);
        $task = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $second->id,
            'title' => 'T', 'position' => 0, 'priority' => 'low', 'triaged_at' => now(),
        ]);

        $this->actingAs($user)
            ->patch("/projects/tasks/{$task->id}/move", [
                'project_column_id' => $first->id,
                'position'          => 0,
            ])
            ->assertRedirect();

        // Uma vez triada, sempre triada — mover de volta não desfaz.
        $this->assertNotNull($task->fresh()->triaged_at);
    }

    public function test_completing_task_marks_triaged(): void
    {
        $user = User::factory()->create();
        [$project, $first] = $this->makeProject($user);
        $task = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $first->id,
            'title' => 'T', 'position' => 0, 'priority' => 'low',
        ]);

        $this->actingAs($user)
            ->patch("/projects/tasks/{$task->id}/toggle-done")
            ->assertRedirect();

        $task->refresh();
        $this->assertNotNull($task->completed_at);
        $this->assertNotNull($task->triaged_at);
    }

    public function test_index_inbox_lists_only_untriaged_not_done(): void
    {
        $user = User::factory()->create();
        [$project, $first] = $this->makeProject($user);
        $done = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Concluído', 'position' => 2]);

        // (a) não-triada e não-concluída → ENTRA no Inbox
        ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $first->id,
            'title' => 'Na inbox', 'position' => 0, 'priority' => 'low',
        ]);
        // (b) triada → fora
        ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $first->id,
            'title' => 'Triada', 'position' => 1, 'priority' => 'low', 'triaged_at' => now(),
        ]);
        // (c) não-triada porém na coluna "Concluído" (isDone) → fora
        ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $done->id,
            'title' => 'Concluída', 'position' => 0, 'priority' => 'low',
        ]);

        $this->actingAs($user)
            ->get('/tasks')
            ->assertInertia(fn ($page) => $page
                ->component('Tasks/Index')
                ->where('inbox_count', 1)
                ->where('inbox.0.title', 'Na inbox')
            );
    }
}
