<?php

namespace App\Domains\Auth\Services;

use App\Domains\Auth\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogger
{
    public function __construct(private Request $request) {}

    public function log(string $event, ?int $userId = null, array $metadata = []): void
    {
        AuditLog::create([
            'user_id' => $userId,
            'event' => $event,
            'ip_address' => $this->request->ip(),
            'user_agent' => $this->request->userAgent(),
            'metadata' => empty($metadata) ? null : $metadata,
        ]);
    }
}
