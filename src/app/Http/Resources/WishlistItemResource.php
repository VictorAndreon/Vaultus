<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WishlistItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'name'              => $this->name,
            'estimated_price'   => $this->estimated_price_encrypted !== null ? (float) $this->estimated_price_encrypted : null,
            'priority'          => $this->priority,
            'url'               => $this->url,
            'notes'             => $this->notes,
            'financial_goal_id' => $this->financial_goal_id,
            'goal'              => $this->whenLoaded('goal', fn() => FinancialGoalResource::make($this->goal)),
        ];
    }
}
