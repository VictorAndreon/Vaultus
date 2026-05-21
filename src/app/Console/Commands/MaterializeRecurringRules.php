<?php

namespace App\Console\Commands;

use App\Domains\Finance\Services\RecurringRuleMaterializer;
use Illuminate\Console\Command;

class MaterializeRecurringRules extends Command
{
    protected $signature = 'recurring:materialize';
    protected $description = 'Cria as Transactions decorrentes de RecurringRule ativas cujo dia do mês já chegou.';

    public function handle(RecurringRuleMaterializer $service): int
    {
        $count = $service->run();
        $this->info("Materializadas {$count} transação(ões) recorrente(s).");
        return self::SUCCESS;
    }
}
