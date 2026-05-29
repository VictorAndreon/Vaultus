<?php

namespace App\Domains\Notes\Models;

use App\Domains\Auth\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Notebook extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['user_id', 'name', 'color'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function notes(): HasMany
    {
        return $this->hasMany(Note::class);
    }

    protected static function newFactory()
    {
        return \Database\Factories\NotebookFactory::new();
    }
}
