<?php

namespace App\Domains\Projects\Services;

use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\Want;

class WantPromotionService
{
    public function promote(Want $want): Project
    {
        $project = Project::create([
            'user_id'     => $want->user_id,
            'want_id'     => $want->id,
            'title'       => $want->title,
            'description' => $want->description,
            'status'      => 'active',
        ]);

        $project->columns()->createMany([
            ['name' => 'A fazer',       'position' => 0],
            ['name' => 'Em progresso',  'position' => 1],
            ['name' => 'Concluído',     'position' => 2],
        ]);

        $want->promoted_at = now();
        $want->save();

        return $project;
    }
}
