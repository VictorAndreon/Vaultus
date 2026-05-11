<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('board_columns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('board_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('color', 7)->nullable();
            $table->integer('position')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void { Schema::dropIfExists('board_columns'); }
};
