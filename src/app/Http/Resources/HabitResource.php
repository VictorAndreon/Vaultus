<?php

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HabitResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $today = Carbon::now($request->user()?->timezone ?? 'UTC')->toDateString();

        return [
            'id'                   => $this->id,
            'name'                 => $this->name,
            'icon'                 => $this->icon,
            'frequency_type'       => $this->frequency_type,
            'frequency_days'       => $this->frequency_days,
            'frequency_times'      => $this->frequency_times,
            'category'             => $this->category,
            'color'                => $this->color,
            'current_streak'       => $this->current_streak,
            'best_streak'          => $this->best_streak,
            'is_active'            => $this->is_active,
            'checked_in_today'     => $this->whenLoaded('checkIns', fn() =>
                $this->checkIns->contains(fn($ci) => $ci->date->toDateString() === $today)
            ),
            'recent_check_ins'     => $this->whenLoaded('checkIns', fn() =>
                $this->checkIns->map(fn($ci) => $ci->date->toDateString())->values()
            ),
            'week_check_ins_count' => $this->when(
                $this->frequency_type === 'x_per_week',
                fn() => $this->whenLoaded('checkIns', fn() =>
                    $this->checkIns->filter(fn($ci) =>
                        $ci->date->gte(Carbon::now()->startOfWeek(Carbon::MONDAY))
                    )->count()
                )
            ),
        ];
    }
}
