<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'account_id'  => $this->account_id,
            'type'        => $this->type,
            'amount'      => (float) $this->amount_encrypted,
            'description' => $this->description,
            'category'    => $this->category,
            'occurred_at' => $this->occurred_at->toDateString(),
        ];
    }
}
