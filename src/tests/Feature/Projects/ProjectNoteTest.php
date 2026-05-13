<?php

namespace Tests\Feature\Projects;

use App\Domains\Auth\Models\User;
use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectNote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectNoteTest extends TestCase
{
    use RefreshDatabase;

    private function makeProject(User $user): Project
    {
        return Project::create(['user_id' => $user->id, 'title' => 'P', 'status' => 'active']);
    }

    public function test_can_create_note(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);

        $this->actingAs($user)
            ->post("/projects/{$project->id}/notes", ['content' => 'Nota importante'])
            ->assertRedirect();

        $this->assertDatabaseHas('project_notes', ['project_id' => $project->id, 'content' => 'Nota importante']);
    }

    public function test_can_update_note(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);
        $note    = ProjectNote::create(['project_id' => $project->id, 'content' => 'Old']);

        $this->actingAs($user)
            ->patch("/projects/notes/{$note->id}", ['content' => 'New'])
            ->assertRedirect();

        $this->assertDatabaseHas('project_notes', ['id' => $note->id, 'content' => 'New']);
    }

    public function test_can_delete_note(): void
    {
        $user    = User::factory()->create();
        $project = $this->makeProject($user);
        $note    = ProjectNote::create(['project_id' => $project->id, 'content' => 'Del']);

        $this->actingAs($user)
            ->delete("/projects/notes/{$note->id}")
            ->assertRedirect();

        $this->assertSoftDeleted('project_notes', ['id' => $note->id]);
    }

    public function test_cannot_modify_note_of_other_users_project(): void
    {
        $user1   = User::factory()->create();
        $user2   = User::factory()->create();
        $project = Project::create(['user_id' => $user1->id, 'title' => 'P', 'status' => 'active']);
        $note    = ProjectNote::create(['project_id' => $project->id, 'content' => 'Secret']);

        $this->actingAs($user2)->patch("/projects/notes/{$note->id}", ['content' => 'Hack'])->assertForbidden();
    }
}
