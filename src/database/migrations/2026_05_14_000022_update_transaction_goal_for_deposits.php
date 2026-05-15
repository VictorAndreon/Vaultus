<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('transaction_goal', function (Blueprint $table) {
            $table->foreignId('transaction_id')->nullable()->change();
            $table->date('occurred_at')->nullable()->after('amount_encrypted');
            $table->string('note')->nullable()->after('occurred_at');
        });
    }

    public function down(): void
    {
        Schema::table('transaction_goal', function (Blueprint $table) {
            $table->dropColumn(['occurred_at', 'note']);
            $table->foreignId('transaction_id')->nullable(false)->change();
        });
    }
};
