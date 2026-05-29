<?php

namespace Database\Factories;

use App\Domains\Notes\Models\Note;
use App\Domains\Notes\Models\Notebook;
use Illuminate\Database\Eloquent\Factories\Factory;

class NoteFactory extends Factory
{
    protected $model = Note::class;

    public function definition(): array
    {
        return [
            'notebook_id' => Notebook::factory(),
            'title' => fake()->sentence(rand(3, 6)),
            'content' => fake()->paragraphs(rand(2, 5), true),
            'is_sensitive' => false,
            'tags' => fake()->randomElements(['ideia', 'leitura', 'design', 'código', 'reflexão', 'tarefa'], rand(0, 3)),
        ];
    }
}
