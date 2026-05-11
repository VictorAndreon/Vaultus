<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransactionGoalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'transaction_id'    => $this->transaction_id,
            'financial_goal_id' => $this->financial_goal_id,
            'amount'            => (float) $this->amount_encrypted,
        ];
    }
}
