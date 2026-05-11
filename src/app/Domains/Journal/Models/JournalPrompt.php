<?php

namespace App\Domains\Journal\Models;

use App\Domains\Auth\Models\User;
use Database\Factories\JournalPromptFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JournalPrompt extends Model
{
    use HasFactory;

    protected static function newFactory(): JournalPromptFactory
    {
        return JournalPromptFactory::new();
    }

    protected $fillable = ['user_id', 'content', 'is_active', 'position'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'position'  => 'integer',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true)->orderBy('position');
    }
}
