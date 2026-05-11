<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('habits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('icon')->nullable();
            $table->string('frequency_type', 20);
            $table->jsonb('frequency_days')->nullable();
            $table->integer('frequency_times')->nullable();
            $table->string('category')->nullable();
            $table->integer('current_streak')->default(0);
            $table->integer('best_streak')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void { Schema::dropIfExists('habits'); }
};
