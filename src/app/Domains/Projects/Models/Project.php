<?php

namespace App\Domains\Projects\Models;

use App\Domains\Auth\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use SoftDeletes;

    protected $fillable = ['user_id', 'want_id', 'title', 'description', 'status'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function want()
    {
        return $this->belongsTo(Want::class);
    }

    public function columns()
    {
        return $this->hasMany(ProjectColumn::class)->orderBy('position');
    }

    public function tasks()
    {
        return $this->hasMany(ProjectTask::class);
    }

    public function notes()
    {
        return $this->hasMany(ProjectNote::class)->latest();
    }

    public function links()
    {
        return $this->hasMany(ProjectLink::class);
    }
}
