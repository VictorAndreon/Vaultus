<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectTaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'project_column_id' => $this->project_column_id,
            'title'             => $this->title,
            'description'       => $this->description,
            'priority'          => $this->priority,
            'position'          => $this->position,
            'due_at'            => $this->due_at?->toDateString(),
        ];
    }
}
