<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * O accessor FinancialGoal::getStatusAttribute() passou a calcular o status em runtime
 * (concluida/atrasado/atencao/no-prazo) a partir de progresso + deadline + monthly_amount.
 * A coluna persistida virou inerte e nunca mais é lida — drop para evitar confusão futura.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('financial_goals', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }

    public function down(): void
    {
        Schema::table('financial_goals', function (Blueprint $table) {
            $table->string('status', 20)->default('no-prazo')->after('is_archived');
        });
    }
};
