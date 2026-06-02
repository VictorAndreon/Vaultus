<?php

namespace App\Domains\Library\Models;

use App\Domains\Auth\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LibraryItem extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id', 'type', 'title', 'status', 'author',
        'total_pages', 'current_page', 'cover_url', 'cover_path',
        'rating', 'genre', 'started_at', 'finished_at',
    ];

    protected function casts(): array
    {
        return [
            'started_at'  => 'date',
            'finished_at' => 'date',
        ];
    }

    public function getProgressPercentAttribute(): int
    {
        if (! $this->total_pages) {
            return 0;
        }

        return min(100, (int) round($this->current_page / $this->total_pages * 100));
    }

    public function getCoverDisplayUrlAttribute(): ?string
    {
        if ($this->cover_path) {
            return route('library.cover', $this->id);
        }

        return $this->cover_url;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
