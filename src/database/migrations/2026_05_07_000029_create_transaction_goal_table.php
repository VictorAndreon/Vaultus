<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('transaction_goal', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained()->cascadeOnDelete();
            $table->foreignId('financial_goal_id')->constrained()->cascadeOnDelete();
            $table->text('amount_encrypted');
            $table->timestamps();
        });
    }

    public function down(): void { Schema::dropIfExists('transaction_goal'); }
};
