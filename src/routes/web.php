<?php

use App\Domains\Auth\Controllers\AuthController;
use App\Domains\Auth\Controllers\TwoFactorController;
use App\Domains\Dashboard\Controllers\DashboardController;
use App\Domains\Habits\Controllers\CheckInController;
use App\Domains\Habits\Controllers\HabitController;
use App\Domains\Habits\Controllers\HealthMetricController;
use App\Domains\Journal\Controllers\JournalEntryController;
use App\Domains\Journal\Controllers\JournalPromptController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/two-factor', [TwoFactorController::class, 'show'])->name('two-factor.show');
    Route::post('/two-factor', [TwoFactorController::class, 'verify'])->name('two-factor.verify');
});

Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Habits — /habits/health-metrics DEVE vir antes de /habits/{habit}
    Route::get('/habits', [HabitController::class, 'index'])->name('habits');
    Route::post('/habits', [HabitController::class, 'store']);
    Route::post('/habits/health-metrics', [HealthMetricController::class, 'store']);
    Route::patch('/habits/{habit}', [HabitController::class, 'update']);
    Route::delete('/habits/{habit}', [HabitController::class, 'destroy']);
    Route::post('/habits/{habit}/check-in', [CheckInController::class, 'store']);
    Route::delete('/habits/{habit}/check-in', [CheckInController::class, 'destroy']);

    // Journal — /journal/prompts DEVE vir antes de /journal/{entry}
    Route::get('/journal', [JournalEntryController::class, 'index'])->name('journal');
    Route::post('/journal', [JournalEntryController::class, 'store']);
    Route::post('/journal/prompts', [JournalPromptController::class, 'store']);
    Route::patch('/journal/prompts/{prompt}', [JournalPromptController::class, 'update']);
    Route::delete('/journal/prompts/{prompt}', [JournalPromptController::class, 'destroy']);
    Route::patch('/journal/{entry}', [JournalEntryController::class, 'update']);

    $stubs = ['tasks', 'projects', 'finance', 'library', 'notes', 'contacts', 'reviews'];
    foreach ($stubs as $module) {
        Route::get("/{$module}", fn() => Inertia::render('Stub/Index', ['module' => $module]))->name($module);
    }
});
