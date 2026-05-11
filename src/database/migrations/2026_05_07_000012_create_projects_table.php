<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('want_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('status', 15)->default('idea');
            $table->string('category')->nullable();
            $table->string('cover_image')->nullable();
            $table->string('cover_color', 7)->nullable();
            $table->text('motivation')->nullable();
            $table->date('started_at')->nullable();
            $table->date('estimated_end_at')->nullable();
            $table->date('completed_at')->nullable();
            $table->integer('total_seconds')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void { Schema::dropIfExists('projects'); }
};
