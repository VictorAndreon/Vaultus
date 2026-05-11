<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('health_metrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->decimal('sleep_hours', 4, 2)->nullable();
            $table->decimal('weight_kg', 5, 2)->nullable();
            $table->smallInteger('mood')->nullable();
            $table->smallInteger('energy')->nullable();
            $table->decimal('water_liters', 4, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'date']);
        });
    }

    public function down(): void { Schema::dropIfExists('health_metrics'); }
};
