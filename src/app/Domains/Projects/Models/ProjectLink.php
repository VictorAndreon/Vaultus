<?php

namespace App\Domains\Projects\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectLink extends Model
{
    protected $fillable = ['project_id', 'title', 'url'];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
