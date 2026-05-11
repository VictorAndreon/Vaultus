<?php

namespace Tests\Feature\Journal;

use App\Domains\Auth\Models\User;
use App\Domains\Journal\Models\JournalPrompt;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JournalPromptTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_prompt(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/journal/prompts', ['content' => 'O que te deixou grato hoje?'])
            ->assertRedirect();

        $this->assertDatabaseHas('journal_prompts', [
            'user_id' => $user->id,
            'content' => 'O que te deixou grato hoje?',
            'is_active' => true,
        ]);
    }

    public function test_can_edit_prompt(): void
    {
        $user   = User::factory()->create();
        $prompt = JournalPrompt::factory()->create(['user_id' => $user->id, 'content' => 'Antigo']);

        $this->actingAs($user)
            ->patch("/journal/prompts/{$prompt->id}", ['content' => 'Novo texto'])
            ->assertRedirect();

        $this->assertDatabaseHas('journal_prompts', ['id' => $prompt->id, 'content' => 'Novo texto']);
    }

    public function test_can_reorder_prompt(): void
    {
        $user   = User::factory()->create();
        $prompt = JournalPrompt::factory()->create(['user_id' => $user->id, 'position' => 0]);

        $this->actingAs($user)
            ->patch("/journal/prompts/{$prompt->id}", ['position' => 2])
            ->assertRedirect();

        $this->assertDatabaseHas('journal_prompts', ['id' => $prompt->id, 'position' => 2]);
    }

    public function test_can_delete_prompt(): void
    {
        $user   = User::factory()->create();
        $prompt = JournalPrompt::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->delete("/journal/prompts/{$prompt->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('journal_prompts', ['id' => $prompt->id]);
    }

    public function test_cannot_modify_other_users_prompt(): void
    {
        $owner  = User::factory()->create();
        $other  = User::factory()->create();
        $prompt = JournalPrompt::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($other)
            ->patch("/journal/prompts/{$prompt->id}", ['content' => 'Hackeado'])
            ->assertForbidden();
    }
}
