<?php

namespace App\Domains\Notes\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Note extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['notebook_id', 'title', 'content', 'is_sensitive', 'tags'];

    protected function casts(): array
    {
        return [
            'is_sensitive' => 'boolean',
            'tags' => 'array',
        ];
    }

    public function notebook(): BelongsTo
    {
        return $this->belongsTo(Notebook::class);
    }

    public function versions(): HasMany
    {
        return $this->hasMany(NoteVersion::class);
    }

    protected static function newFactory()
    {
        return \Database\Factories\NoteFactory::new();
    }
}
