<?php

namespace Tests\Feature\Projects;

use App\Domains\Auth\Models\User;
use App\Domains\Projects\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectTest extends TestCase
{
    use RefreshDatabase;

    public function test_projects_page_requires_auth(): void
    {
        $this->get('/projects')->assertRedirect('/login');
    }

    public function test_projects_page_renders_with_correct_props(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/projects')
            ->assertStatus(200)
            ->assertInertia(fn ($p) => $p
                ->component('Projects/Index')
                ->has('projects')
                ->has('wants')
            );
    }

    public function test_can_create_project(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/projects', [
                'title'  => 'Aprender Rust',
                'status' => 'active',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('projects', [
            'user_id' => $user->id,
            'title'   => 'Aprender Rust',
        ]);
    }

    public function test_can_update_project(): void
    {
        $user    = User::factory()->create();
        $project = Project::create(['user_id' => $user->id, 'title' => 'Old', 'status' => 'active']);

        $this->actingAs($user)
            ->patch("/projects/{$project->id}", ['title' => 'New'])
            ->assertRedirect();

        $this->assertDatabaseHas('projects', ['id' => $project->id, 'title' => 'New']);
    }

    public function test_can_delete_project(): void
    {
        $user    = User::factory()->create();
        $project = Project::create(['user_id' => $user->id, 'title' => 'Del', 'status' => 'active']);

        $this->actingAs($user)
            ->delete("/projects/{$project->id}")
            ->assertRedirect();

        $this->assertSoftDeleted('projects', ['id' => $project->id]);
    }

    public function test_cannot_access_other_users_project(): void
    {
        $user1   = User::factory()->create();
        $user2   = User::factory()->create();
        $project = Project::create(['user_id' => $user1->id, 'title' => 'Secret', 'status' => 'active']);

        $this->actingAs($user2)
            ->get("/projects/{$project->id}")
            ->assertForbidden();
    }

    public function test_project_show_renders_kanban_props(): void
    {
        $user    = User::factory()->create();
        $project = Project::create(['user_id' => $user->id, 'title' => 'P1', 'status' => 'active']);

        $this->actingAs($user)
            ->get("/projects/{$project->id}")
            ->assertStatus(200)
            ->assertInertia(fn ($p) => $p
                ->component('Projects/Project')
                ->has('project')
            );
    }
}
