<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FinancialGoalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'name'             => $this->name,
            'target_amount'    => (float) $this->target_amount_encrypted,
            'current_amount'   => $this->current_amount,
            'progress_percent' => $this->progress_percent,
            'category'         => $this->category,
            'deadline'         => $this->deadline?->toDateString(),
            'is_completed'     => $this->is_completed,
            'is_archived'      => $this->is_archived,
        ];
    }
}
