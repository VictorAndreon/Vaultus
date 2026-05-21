<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recurring_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('account_id')->constrained('accounts')->cascadeOnDelete();
            $table->string('type', 16); // income | expense
            $table->text('amount_encrypted');
            $table->string('description');
            $table->string('category', 100)->nullable();
            $table->unsignedTinyInteger('day_of_month'); // 1-31; meses curtos cortam pro último dia
            $table->date('starts_on');
            $table->date('ends_on')->nullable();
            $table->date('last_run_on')->nullable(); // última materialização (referência mês/ano)
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recurring_rules');
    }
};
