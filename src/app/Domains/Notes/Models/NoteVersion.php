<?php

namespace App\Domains\Notes\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NoteVersion extends Model
{
    public $timestamps = false;

    protected $fillable = ['note_id', 'content', 'created_at'];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function note(): BelongsTo
    {
        return $this->belongsTo(Note::class);
    }
}
