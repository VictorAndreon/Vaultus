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

    public static function nameIsDone(?string $name): bool
    {
        if ($name === null) {
            return false;
        }

        $lower = mb_strtolower($name);

        return str_contains($lower, 'done') || str_contains($lower, 'conclu');
    }

    public function isDoneColumn(): bool
    {
        return self::nameIsDone($this->name);
    }
}
