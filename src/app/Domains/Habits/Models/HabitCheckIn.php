<?php

namespace App\Domains\Habits\Models;

use Database\Factories\HabitCheckInFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HabitCheckIn extends Model
{
    use HasFactory;

    protected static function newFactory(): HabitCheckInFactory
    {
        return HabitCheckInFactory::new();
    }

    protected $fillable = ['habit_id', 'date'];

    protected function casts(): array
    {
        return ['date' => 'date'];
    }

    public function habit()
    {
        return $this->belongsTo(Habit::class);
    }
}
