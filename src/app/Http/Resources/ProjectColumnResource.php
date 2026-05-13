<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectColumnResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'       => $this->id,
            'name'     => $this->name,
            'position' => $this->position,
            'tasks'    => ProjectTaskResource::collection($this->whenLoaded('tasks')),
        ];
    }
}
