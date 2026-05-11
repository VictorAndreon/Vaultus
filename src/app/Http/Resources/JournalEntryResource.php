<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JournalEntryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'date'             => $this->date->toDateString(),
            'content'          => $this->content,
            'tags'             => $this->tags ?? [],
            'health_metric_id' => $this->health_metric_id,
            'mood'             => $this->whenLoaded('healthMetric', fn() => $this->healthMetric?->mood),
            'energy'           => $this->whenLoaded('healthMetric', fn() => $this->healthMetric?->energy),
            'preview'          => $this->content
                ? mb_substr(strip_tags($this->content), 0, 100)
                : null,
        ];
    }
}
