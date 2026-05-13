<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('wants', function (Blueprint $table) {
            $table->string('category')->nullable()->after('description');
            $table->string('priority', 10)->default('medium')->after('category');
            $table->timestamp('promoted_at')->nullable()->after('priority');
        });
    }

    public function down(): void
    {
        Schema::table('wants', function (Blueprint $table) {
            $table->dropColumn(['category', 'priority', 'promoted_at']);
        });
    }
};
