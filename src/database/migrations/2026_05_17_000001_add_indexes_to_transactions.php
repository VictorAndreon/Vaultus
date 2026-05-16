<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->index(['account_id', 'occurred_at'], 'transactions_account_id_occurred_at_idx');
            $table->index(['account_id', 'type'],        'transactions_account_id_type_idx');
            $table->index(['occurred_at'],               'transactions_occurred_at_idx');
            $table->index(['category'],                  'transactions_category_idx');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex('transactions_account_id_occurred_at_idx');
            $table->dropIndex('transactions_account_id_type_idx');
            $table->dropIndex('transactions_occurred_at_idx');
            $table->dropIndex('transactions_category_idx');
        });
    }
};
