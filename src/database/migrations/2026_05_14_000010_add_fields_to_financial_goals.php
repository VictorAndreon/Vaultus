<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('financial_goals', function (Blueprint $table) {
            $table->string('icon', 20)->default('Shield')->after('name');
            $table->string('color', 60)->default('var(--green)')->after('icon');
            $table->string('note', 255)->nullable()->after('color');
            $table->text('monthly_amount_encrypted')->nullable()->after('current_amount_encrypted');
            $table->string('status', 20)->default('no-prazo')->after('is_archived');
        });
    }

    public function down(): void
    {
        Schema::table('financial_goals', function (Blueprint $table) {
            $table->dropColumn(['icon', 'color', 'note', 'monthly_amount_encrypted', 'status']);
        });
    }
};
