<?php

namespace App\Shared\Traits;

use App\Domains\Auth\Models\AuditLog;

trait HasAuditLog
{
    public function auditLogs()
    {
        return $this->morphMany(AuditLog::class, 'auditable');
    }
}
