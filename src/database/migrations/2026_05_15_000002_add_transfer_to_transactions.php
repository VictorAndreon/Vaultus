<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('transfer_to_account_id')
                ->nullable()
                ->after('occurred_at')
                ->constrained('accounts')
                ->nullOnDelete();

            $table->foreignId('transfer_pair_id')
                ->nullable()
                ->after('transfer_to_account_id')
                ->constrained('transactions')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('transfer_to_account_id');
            $table->dropConstrainedForeignId('transfer_pair_id');
        });
    }
};
