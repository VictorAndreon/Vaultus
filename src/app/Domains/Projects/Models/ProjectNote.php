<?php

namespace App\Domains\Projects\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProjectNote extends Model
{
    use SoftDeletes;

    protected $fillable = ['project_id', 'content'];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
