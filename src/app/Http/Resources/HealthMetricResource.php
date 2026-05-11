<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HealthMetricResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'date'         => $this->date->toDateString(),
            'mood'         => $this->mood,
            'energy'       => $this->energy,
            'sleep_hours'  => $this->sleep_hours,
            'water_liters' => $this->water_liters,
            'weight_kg'    => $this->weight_kg,
            'notes'        => $this->notes,
        ];
    }
}
