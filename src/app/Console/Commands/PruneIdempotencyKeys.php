<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class PruneIdempotencyKeys extends Command
{
    protected $signature = 'idempotency:prune {--days=7}';
    protected $description = 'Remove idempotency keys mais antigas que N dias';

    public function handle(): int
    {
        $days   = (int) $this->option('days');
        $cutoff = now()->subDays($days);

        $deleted = DB::table('idempotency_keys')->where('created_at', '<', $cutoff)->delete();

        $this->info(sprintf('Removidas %d chaves de idempotência anteriores a %s', $deleted, $cutoff->toDateString()));
        return self::SUCCESS;
    }
}
