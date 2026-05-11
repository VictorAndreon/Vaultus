<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('project_task_timers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_task_id')->constrained()->cascadeOnDelete();
            $table->timestamp('started_at');
            $table->timestamp('stopped_at')->nullable();
            $table->integer('seconds')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void { Schema::dropIfExists('project_task_timers'); }
};
