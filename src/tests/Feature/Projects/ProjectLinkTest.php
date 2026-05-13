<?php

namespace Tests\Feature\Projects;

use App\Domains\Auth\Models\User;
use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectLink;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectLinkTest extends TestCase
{
    use RefreshDatabase;

    private function makeProject(User $user): Project
    {
        return Project::create(['user_id' => $user->id, 'title' => 'P', 'status' => 'active']);
    }

    public function test_can_create_link(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/links", [
                'title' => 'GitHub',
                'url'   => 'https://github.com',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('project_links', ['project_id' => $project->id, 'title' => 'GitHub']);
    }

    public function test_can_delete_link(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);
        $link    = ProjectLink::create(['project_id' => $project->id, 'title' => 'G', 'url' => 'https://g.com']);

        $this->actingAs($user)
            ->delete("/projects/links/{$link->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('project_links', ['id' => $link->id]);
    }

    public function test_cannot_delete_link_of_other_users_project(): void
    {
        $user1   = User::factory()->create();
        $user2   = User::factory()->create();
        $project = Project::create(['user_id' => $user1->id, 'title' => 'P', 'status' => 'active']);
        $link    = ProjectLink::create(['project_id' => $project->id, 'title' => 'G', 'url' => 'https://g.com']);

        $this->actingAs($user2)->delete("/projects/links/{$link->id}")->assertForbidden();
    }
}
