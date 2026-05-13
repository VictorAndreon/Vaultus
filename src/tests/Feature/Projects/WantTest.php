<?php

namespace Tests\Feature\Projects;

use App\Domains\Auth\Models\User;
use App\Domains\Projects\Models\Want;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WantTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_want(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/wants', [
                'title'    => 'Aprender Go',
                'priority' => 'high',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('wants', ['user_id' => $user->id, 'title' => 'Aprender Go']);
    }

    public function test_can_update_want(): void
    {
        $user = User::factory()->create();
        $want = Want::create(['user_id' => $user->id, 'title' => 'Old']);

        $this->actingAs($user)
            ->patch("/wants/{$want->id}", ['title' => 'New'])
            ->assertRedirect();

        $this->assertDatabaseHas('wants', ['id' => $want->id, 'title' => 'New']);
    }

    public function test_can_delete_want(): void
    {
        $user = User::factory()->create();
        $want = Want::create(['user_id' => $user->id, 'title' => 'Del']);

        $this->actingAs($user)
            ->delete("/wants/{$want->id}")
            ->assertRedirect();

        $this->assertSoftDeleted('wants', ['id' => $want->id]);
    }

    public function test_promote_creates_project_with_three_columns(): void
    {
        $user = User::factory()->create();
        $want = Want::create(['user_id' => $user->id, 'title' => 'Meu Projeto']);

        $response = $this->actingAs($user)->post("/wants/{$want->id}/promote");

        $this->assertDatabaseHas('projects', [
            'user_id' => $user->id,
            'title'   => 'Meu Projeto',
            'want_id' => $want->id,
        ]);

        $project = $user->projects()->first();
        $response->assertRedirect("/projects/{$project->id}");
        $this->assertCount(3, $project->columns);

        $want->refresh();
        $this->assertNotNull($want->promoted_at);
    }

    public function test_cannot_modify_other_users_want(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $want  = Want::create(['user_id' => $user1->id, 'title' => 'Private']);

        $this->actingAs($user2)->patch("/wants/{$want->id}", ['title' => 'Hacked'])->assertForbidden();
        $this->actingAs($user2)->delete("/wants/{$want->id}")->assertForbidden();
        $this->actingAs($user2)->post("/wants/{$want->id}/promote")->assertForbidden();
    }
}
