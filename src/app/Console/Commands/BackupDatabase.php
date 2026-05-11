<?php

namespace App\Console\Commands;

use App\Shared\Services\BackupService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class BackupDatabase extends Command
{
    protected $signature = 'backup:run {--type=daily : Tipo do backup (daily|weekly|monthly)}';
    protected $description = 'Realiza backup criptografado do banco de dados';

    public function handle(BackupService $backup): int
    {
        $type = $this->option('type');

        if (!in_array($type, ['daily', 'weekly', 'monthly'], true)) {
            $this->error("Tipo inválido: {$type}. Use daily, weekly ou monthly.");
            return self::FAILURE;
        }

        try {
            $path = $backup->run($type);
            $backup->pruneOld($type);
            Log::channel('backup')->info("Backup {$type} concluído: {$path}");
            $this->info("Backup salvo em: {$path}");
            return self::SUCCESS;
        } catch (\RuntimeException $e) {
            Log::channel('backup')->critical("Backup {$type} falhou: {$e->getMessage()}");
            $this->error("Backup falhou: {$e->getMessage()}");
            return self::FAILURE;
        }
    }
}
