<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('card_timers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('card_id')->constrained()->cascadeOnDelete();
            $table->timestamp('started_at');
            $table->timestamp('stopped_at')->nullable();
            $table->integer('seconds')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void { Schema::dropIfExists('card_timers'); }
};
