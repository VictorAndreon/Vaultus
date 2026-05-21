<?php

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schedule;

Schedule::command('backup:run --type=daily')
    ->dailyAt('03:00')
    ->withoutOverlapping()
    ->onFailure(fn() => Log::channel('backup')->critical('Backup diário falhou no scheduler'));

Schedule::command('backup:run --type=weekly')
    ->weeklyOn(0, '03:30')
    ->withoutOverlapping();

Schedule::command('backup:run --type=monthly')
    ->monthlyOn(1, '04:00')
    ->withoutOverlapping();

Schedule::command('idempotency:prune --days=7')
    ->daily();

Schedule::command('recurring:materialize')
    ->dailyAt('06:00')
    ->withoutOverlapping();
