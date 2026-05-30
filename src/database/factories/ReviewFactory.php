<?php

namespace Database\Factories;

use App\Domains\Auth\Models\User;
use App\Domains\Reviews\Models\Review;
use Illuminate\Database\Eloquent\Factories\Factory;

class ReviewFactory extends Factory
{
    protected $model = Review::class;

    public function definition(): array
    {
        return [
            'user_id'      => User::factory(),
            'type'         => 'weekly',
            'period_start' => now()->startOfWeek(),
            'period_end'   => now()->endOfWeek(),
            'content'      => $this->emptyContent(),
        ];
    }

    public function emptyContent(): array
    {
        return [
            'funcionou_bem'  => [],
            'pode_melhorar'  => [],
            'aprendizados'   => [],
            'proxima_semana' => [],
        ];
    }
}
