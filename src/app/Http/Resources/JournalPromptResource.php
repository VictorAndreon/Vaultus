<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JournalPromptResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'        => $this->id,
            'content'   => $this->content,
            'is_active' => $this->is_active,
            'position'  => $this->position,
        ];
    }
}
