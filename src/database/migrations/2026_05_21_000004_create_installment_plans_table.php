<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('installment_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('account_id')->constrained('accounts')->cascadeOnDelete();
            $table->string('description');
            $table->text('total_amount_encrypted');
            $table->unsignedSmallInteger('installments');
            $table->date('first_due_on');
            $table->string('category', 100)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id']);
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('installment_plan_id')->nullable()->constrained('installment_plans')->nullOnDelete();
            $table->unsignedSmallInteger('installment_number')->nullable();
            $table->index('installment_plan_id');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['installment_plan_id']);
            $table->dropColumn(['installment_plan_id', 'installment_number']);
        });
        Schema::dropIfExists('installment_plans');
    }
};
