<?php

namespace Tests\Feature\Projects;

use App\Domains\Auth\Models\User;
use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectColumn;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectColumnTest extends TestCase
{
    use RefreshDatabase;

    private function makeProject(User $user): Project
    {
        return Project::create(['user_id' => $user->id, 'title' => 'P', 'status' => 'active']);
    }

    public function test_can_create_column(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/columns", ['name' => 'Backlog', 'position' => 0])
            ->assertRedirect();

        $this->assertDatabaseHas('project_columns', ['project_id' => $project->id, 'name' => 'Backlog']);
    }

    public function test_can_update_column(): void
    {
        $user   = User::factory()->create();
        $project = $this->makeProject($user);
        $column = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Old', 'position' => 0]);

        $this->actingAs($user)
            ->patch("/projects/{$project->id}/columns/{$column->id}", ['name' => 'New'])
            ->assertRedirect();

        $this->assertDatabaseHas('project_columns', ['id' => $column->id, 'name' => 'New']);
    }

    public function test_can_delete_column(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);
        $column  = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Del', 'position' => 0]);

        $this->actingAs($user)
            ->delete("/projects/{$project->id}/columns/{$column->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('project_columns', ['id' => $column->id]);
    }

    public function test_cannot_modify_column_of_other_users_project(): void
    {
        $user1   = User::factory()->create();
        $user2   = User::factory()->create();
        $project = Project::create(['user_id' => $user1->id, 'title' => 'P', 'status' => 'active']);
        $column  = ProjectColumn::create(['project_id' => $project->id, 'name' => 'Col', 'position' => 0]);

        $this->actingAs($user2)
            ->patch("/projects/{$project->id}/columns/{$column->id}", ['name' => 'Hack'])
            ->assertForbidden();
    }
}
