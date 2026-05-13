<?php

namespace App\Domains\Projects\Services;

use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\Want;
use Illuminate\Support\Facades\DB;

class WantPromotionService
{
    public function promote(Want $want): Project
    {
        if ($want->promoted_at !== null) {
            throw new \LogicException("Want [{$want->id}] já foi promovido.");
        }

        return DB::transaction(function () use ($want) {
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
        });
    }
}
