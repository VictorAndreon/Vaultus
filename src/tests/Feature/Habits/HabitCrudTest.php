<?php

namespace Tests\Feature\Habits;

use App\Domains\Auth\Models\User;
use App\Domains\Habits\Models\Habit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HabitCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_habits_page_requires_auth(): void
    {
        $this->get('/habits')->assertRedirect('/login');
    }

    public function test_habits_page_renders_with_correct_props(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/habits')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Habits/Index')
                ->has('habits')
                ->has('today_metrics')
                ->has('today')
            );
    }

    public function test_can_create_daily_habit(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/habits', [
                'name'           => 'Meditar',
                'icon'           => '🧘',
                'frequency_type' => 'daily',
                'category'       => 'Bem-estar',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('habits', [
            'user_id'        => $user->id,
            'name'           => 'Meditar',
            'frequency_type' => 'daily',
        ]);
    }

    public function test_can_create_weekly_habit(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/habits', [
                'name'           => 'Musculação',
                'frequency_type' => 'weekly',
                'frequency_days' => [1, 3, 5],
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('habits', [
            'user_id'        => $user->id,
            'frequency_type' => 'weekly',
        ]);
    }

    public function test_can_create_x_per_week_habit(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/habits', [
                'name'            => 'Correr',
                'frequency_type'  => 'x_per_week',
                'frequency_times' => 3,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('habits', [
            'user_id'         => $user->id,
            'frequency_times' => 3,
        ]);
    }

    public function test_can_update_habit(): void
    {
        $user  = User::factory()->create();
        $habit = Habit::factory()->create(['user_id' => $user->id, 'name' => 'Antigo']);

        $this->actingAs($user)
            ->patch("/habits/{$habit->id}", ['name' => 'Novo Nome'])
            ->assertRedirect();

        $this->assertDatabaseHas('habits', ['id' => $habit->id, 'name' => 'Novo Nome']);
    }

    public function test_can_soft_delete_habit(): void
    {
        $user  = User::factory()->create();
        $habit = Habit::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->delete("/habits/{$habit->id}")
            ->assertRedirect();

        $this->assertSoftDeleted('habits', ['id' => $habit->id]);
    }

    public function test_cannot_modify_other_users_habit(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $habit = Habit::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($other)
            ->patch("/habits/{$habit->id}", ['name' => 'Hackeado'])
            ->assertForbidden();
    }
}
