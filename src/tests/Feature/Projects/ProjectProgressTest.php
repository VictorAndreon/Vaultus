<?php

namespace Tests\Feature\Projects;

use App\Domains\Auth\Models\User;
use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectColumn;
use App\Domains\Projects\Models\ProjectTask;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectProgressTest extends TestCase
{
    use RefreshDatabase;

    public function test_name_is_done_detects_done_columns(): void
    {
        $this->assertTrue(ProjectColumn::nameIsDone('Concluído'));
        $this->assertTrue(ProjectColumn::nameIsDone('concluida'));
        $this->assertTrue(ProjectColumn::nameIsDone('Done'));
        $this->assertTrue(ProjectColumn::nameIsDone('DONE — entregue'));
        $this->assertFalse(ProjectColumn::nameIsDone('A fazer'));
        $this->assertFalse(ProjectColumn::nameIsDone('Em progresso'));
        $this->assertFalse(ProjectColumn::nameIsDone(null));
    }

    public function test_task_is_done_by_completed_at_or_done_column(): void
    {
        $user    = User::factory()->create();
        $project = Project::create(['user_id' => $user->id, 'title' => 'P', 'status' => 'active']);
        $todo    = ProjectColumn::create(['project_id' => $project->id, 'name' => 'A fazer', 'position' => 0]);
        $done    = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Concluído', 'position' => 1]);

        $open = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $todo->id,
            'title' => 'Aberta', 'position' => 0, 'priority' => 'low',
        ]);
        $byFlag = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $todo->id,
            'title' => 'Flag', 'position' => 1, 'priority' => 'low', 'completed_at' => now(),
        ]);
        $byColumn = ProjectTask::create([
            'project_id' => $project->id, 'project_column_id' => $done->id,
            'title' => 'Coluna', 'position' => 0, 'priority' => 'low',
        ]);

        $this->assertFalse($open->isDone());
        $this->assertTrue($byFlag->isDone());
        $this->assertTrue($byColumn->isDone());
    }

    public function test_progress_percent_counts_done_over_total(): void
    {
        $user    = User::factory()->create();
        $project = Project::create(['user_id' => $user->id, 'title' => 'P', 'status' => 'active']);
        $todo    = ProjectColumn::create(['project_id' => $project->id, 'name' => 'A fazer', 'position' => 0]);
        $done    = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Concluído', 'position' => 1]);

        ProjectTask::create(['project_id' => $project->id, 'project_column_id' => $todo->id, 'title' => 't1', 'position' => 0, 'priority' => 'low']);
        ProjectTask::create(['project_id' => $project->id, 'project_column_id' => $todo->id, 'title' => 't2', 'position' => 1, 'priority' => 'low', 'completed_at' => now()]);
        ProjectTask::create(['project_id' => $project->id, 'project_column_id' => $done->id, 'title' => 't3', 'position' => 0, 'priority' => 'low']);
        ProjectTask::create(['project_id' => $project->id, 'project_column_id' => $todo->id, 'title' => 't4', 'position' => 2, 'priority' => 'low']);

        $project->load('tasks.column');

        $this->assertSame(2, $project->tasksDoneCount());
        $this->assertSame(50, $project->progressPercent());
    }

    public function test_progress_percent_is_zero_without_tasks(): void
    {
        $user    = User::factory()->create();
        $project = Project::create(['user_id' => $user->id, 'title' => 'P', 'status' => 'active']);
        $project->load('tasks.column');

        $this->assertSame(0, $project->progressPercent());
    }
}
