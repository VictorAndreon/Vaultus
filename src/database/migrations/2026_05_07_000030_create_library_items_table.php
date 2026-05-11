<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('library_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 10);
            $table->string('title');
            $table->string('status', 15);
            $table->smallInteger('rating')->nullable();
            $table->text('notes')->nullable();
            $table->string('genre')->nullable();
            $table->string('cover_url')->nullable();
            $table->string('author')->nullable();
            $table->integer('total_pages')->nullable();
            $table->integer('current_page')->nullable()->default(0);
            $table->string('platform', 100)->nullable();
            $table->integer('season_count')->nullable();
            $table->date('started_at')->nullable();
            $table->date('finished_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void { Schema::dropIfExists('library_items'); }
};
