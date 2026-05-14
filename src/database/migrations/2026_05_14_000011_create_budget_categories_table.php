<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('budget_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->text('budget_amount_encrypted');
            $table->string('color', 60)->default('var(--green)');
            $table->integer('position')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void { Schema::dropIfExists('budget_categories'); }
};
