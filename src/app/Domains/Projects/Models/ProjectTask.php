<?php

namespace App\Domains\Projects\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProjectTask extends Model
{
    use SoftDeletes;

    protected $fillable = ['project_id', 'project_column_id', 'title', 'description', 'priority', 'tag', 'position', 'due_at', 'completed_at'];

    protected function casts(): array
    {
        return [
            'due_at'       => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function column()
    {
        return $this->belongsTo(ProjectColumn::class, 'project_column_id');
    }

    public function isDone(): bool
    {
        return $this->completed_at !== null || ($this->column?->isDoneColumn() ?? false);
    }
}
