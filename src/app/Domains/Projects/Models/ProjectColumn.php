<?php

namespace App\Domains\Projects\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectColumn extends Model
{
    protected $fillable = ['project_id', 'name', 'position'];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function tasks()
    {
        return $this->hasMany(ProjectTask::class, 'project_column_id')->orderBy('position');
    }
}
