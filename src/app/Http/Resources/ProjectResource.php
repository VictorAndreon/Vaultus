<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'title'       => $this->title,
            'description' => $this->description,
            'status'      => $this->status,
            'want_id'     => $this->want_id,
            'tasks_count' => $this->whenCounted('tasks'),
            'columns'     => ProjectColumnResource::collection($this->whenLoaded('columns')),
            'notes'       => ProjectNoteResource::collection($this->whenLoaded('notes')),
            'links'       => ProjectLinkResource::collection($this->whenLoaded('links')),
        ];
    }
}
