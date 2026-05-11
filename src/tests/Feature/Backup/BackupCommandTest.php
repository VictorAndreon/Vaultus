<?php

namespace Tests\Feature\Backup;

use App\Shared\Services\BackupService;
use Tests\TestCase;

class BackupCommandTest extends TestCase
{
    public function test_backup_command_calls_service_and_exits_zero(): void
    {
        $mock = $this->mock(BackupService::class);
        $mock->shouldReceive('run')->once()->with('daily')->andReturn('/backups/daily/test.gpg');
        $mock->shouldReceive('pruneOld')->once()->with('daily');

        $this->artisan('backup:run --type=daily')->assertExitCode(0);
    }

    public function test_backup_command_accepts_weekly_type(): void
    {
        $mock = $this->mock(BackupService::class);
        $mock->shouldReceive('run')->once()->with('weekly')->andReturn('/backups/weekly/test.gpg');
        $mock->shouldReceive('pruneOld')->once()->with('weekly');

        $this->artisan('backup:run --type=weekly')->assertExitCode(0);
    }

    public function test_backup_command_returns_failure_on_exception(): void
    {
        $mock = $this->mock(BackupService::class);
        $mock->shouldReceive('run')->andThrow(new \RuntimeException('pg_dump falhou'));

        $this->artisan('backup:run --type=daily')->assertExitCode(1);
    }

    public function test_invalid_type_returns_failure(): void
    {
        $this->artisan('backup:run --type=invalid')->assertExitCode(1);
    }
}
