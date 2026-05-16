<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->boolean('is_internal')->default(false)->after('currency');
            $table->foreignId('goal_id')
                ->nullable()
                ->after('is_internal')
                ->constrained('financial_goals')
                ->nullOnDelete();

            $table->index(['user_id', 'is_internal']);
        });
    }

    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'is_internal']);
            $table->dropConstrainedForeignId('goal_id');
            $table->dropColumn('is_internal');
        });
    }
};
