<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'title'       => $this->title,
            'description' => $this->description,
            'category'    => $this->category,
            'priority'    => $this->priority,
            'promoted_at' => $this->promoted_at?->toDateString(),
        ];
    }
}
