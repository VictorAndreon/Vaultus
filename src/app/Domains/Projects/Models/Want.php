<?php

namespace App\Domains\Projects\Models;

use App\Domains\Auth\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Want extends Model
{
    use SoftDeletes;

    protected $fillable = ['user_id', 'title', 'description', 'category', 'priority'];

    protected function casts(): array
    {
        return ['promoted_at' => 'datetime'];
    }

    public function scopeUnpromoted($query)
    {
        return $query->whereNull('promoted_at');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function project()
    {
        return $this->hasOne(Project::class);
    }
}
