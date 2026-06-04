<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('project_tasks', function (Blueprint $table) {
            $table->timestamp('triaged_at')->nullable()->after('completed_at');
        });

        // Backfill: tarefas existentes nascem triadas para o Inbox começar vazio.
        DB::table('project_tasks')->update([
            'triaged_at' => DB::raw('COALESCE(completed_at, created_at)'),
        ]);
    }

    public function down(): void
    {
        Schema::table('project_tasks', function (Blueprint $table) {
            $table->dropColumn('triaged_at');
        });
    }
};
