<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('upcoming_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('description', 255);
            $table->text('amount_encrypted');
            $table->date('due_date');
            $table->string('tag', 20)->nullable(); // 'meta' ou null
            $table->foreignId('linked_goal_id')->nullable()->constrained('financial_goals')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('upcoming_payments');
    }
};
