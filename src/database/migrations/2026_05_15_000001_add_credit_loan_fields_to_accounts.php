<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->text('credit_limit_encrypted')->nullable()->after('balance_encrypted');
            $table->decimal('interest_rate', 5, 2)->nullable()->after('credit_limit_encrypted');
        });
    }

    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropColumn(['credit_limit_encrypted', 'interest_rate']);
        });
    }
};
