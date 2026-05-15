<?php

use App\Domains\Auth\Controllers\AuthController;
use App\Domains\Auth\Controllers\TwoFactorController;
use App\Domains\Dashboard\Controllers\DashboardController;
use App\Domains\Habits\Controllers\CheckInController;
use App\Domains\Habits\Controllers\HabitController;
use App\Domains\Habits\Controllers\HealthMetricController;
use App\Domains\Finance\Controllers\AccountController;
use App\Domains\Finance\Controllers\FinanceController;
use App\Domains\Finance\Controllers\GoalController;
use App\Domains\Finance\Controllers\TransactionController;
use App\Domains\Finance\Controllers\TransactionGoalController;
use App\Domains\Finance\Controllers\WishlistController;
use App\Domains\Journal\Controllers\JournalEntryController;
use App\Domains\Journal\Controllers\JournalPromptController;
use App\Domains\Projects\Controllers\ProjectController;
use App\Domains\Projects\Controllers\WantController;
use App\Domains\Projects\Controllers\ProjectColumnController;
use App\Domains\Projects\Controllers\ProjectTaskController;
use App\Domains\Projects\Controllers\ProjectNoteController;
use App\Domains\Projects\Controllers\ProjectLinkController;
use App\Domains\Tasks\Controllers\TasksController;
use App\Domains\Library\Controllers\LibraryController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn() => redirect('/dashboard'));

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

    // Finance
    Route::get('/finance', [FinanceController::class, 'index'])->name('finance');
    Route::get('/finance/accounts/{account}', [AccountController::class, 'show']);
    Route::post('/finance/accounts', [AccountController::class, 'store']);
    Route::patch('/finance/accounts/{account}', [AccountController::class, 'update']);
    Route::delete('/finance/accounts/{account}', [AccountController::class, 'destroy']);
    Route::post('/finance/accounts/{account}/transactions', [TransactionController::class, 'store']);
    Route::patch('/finance/transactions/{transaction}', [TransactionController::class, 'update']);
    Route::delete('/finance/transactions/{transaction}', [TransactionController::class, 'destroy']);
    Route::post('/finance/goals', [GoalController::class, 'store']);
    Route::patch('/finance/goals/{goal}', [GoalController::class, 'update']);
    Route::delete('/finance/goals/{goal}', [GoalController::class, 'destroy']);
    Route::post('/finance/goals/{goal}/deposit', [GoalController::class, 'deposit']);
    Route::post('/finance/wishlist', [WishlistController::class, 'store']);
    Route::patch('/finance/wishlist/{item}', [WishlistController::class, 'update']);
    Route::delete('/finance/wishlist/{item}', [WishlistController::class, 'destroy']);
    Route::post('/finance/transactions/{transaction}/allocations', [TransactionGoalController::class, 'store']);
    Route::delete('/finance/allocations/{allocation}', [TransactionGoalController::class, 'destroy']);
    Route::post('/finance/budget-categories', [\App\Domains\Finance\Controllers\BudgetCategoryController::class, 'store']);
    Route::put('/finance/budget-categories/batch', [\App\Domains\Finance\Controllers\BudgetCategoryController::class, 'batch']);
    Route::patch('/finance/budget-categories/{category}', [\App\Domains\Finance\Controllers\BudgetCategoryController::class, 'update']);
    Route::delete('/finance/budget-categories/{category}', [\App\Domains\Finance\Controllers\BudgetCategoryController::class, 'destroy']);
    Route::post('/finance/upcoming-payments', [\App\Domains\Finance\Controllers\UpcomingPaymentController::class, 'store']);
    Route::patch('/finance/upcoming-payments/{payment}', [\App\Domains\Finance\Controllers\UpcomingPaymentController::class, 'update']);
    Route::delete('/finance/upcoming-payments/{payment}', [\App\Domains\Finance\Controllers\UpcomingPaymentController::class, 'destroy']);

    // Projects
    Route::get('/projects', [ProjectController::class, 'index'])->name('projects');
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects/{project}', [ProjectController::class, 'show']);
    Route::patch('/projects/{project}', [ProjectController::class, 'update']);
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);

    // Wants
    Route::post('/wants', [WantController::class, 'store']);
    Route::patch('/wants/{want}', [WantController::class, 'update']);
    Route::delete('/wants/{want}', [WantController::class, 'destroy']);
    Route::post('/wants/{want}/promote', [WantController::class, 'promote']);

    // Project Columns
    Route::post('/projects/{project}/columns', [ProjectColumnController::class, 'store']);
    Route::patch('/projects/{project}/columns/{column}', [ProjectColumnController::class, 'update']);
    Route::delete('/projects/{project}/columns/{column}', [ProjectColumnController::class, 'destroy']);

    // Project Tasks
    Route::post('/projects/{project}/tasks', [ProjectTaskController::class, 'store']);
    Route::patch('/projects/tasks/{task}', [ProjectTaskController::class, 'update']);
    Route::patch('/projects/tasks/{task}/toggle-done', [ProjectTaskController::class, 'toggleDone']);
    Route::delete('/projects/tasks/{task}', [ProjectTaskController::class, 'destroy']);
    Route::patch('/projects/tasks/{task}/move', [ProjectTaskController::class, 'move']);

    // Project Notes
    Route::post('/projects/{project}/notes', [ProjectNoteController::class, 'store']);
    Route::patch('/projects/notes/{note}', [ProjectNoteController::class, 'update']);
    Route::delete('/projects/notes/{note}', [ProjectNoteController::class, 'destroy']);

    // Project Links
    Route::post('/projects/{project}/links', [ProjectLinkController::class, 'store']);
    Route::delete('/projects/links/{link}', [ProjectLinkController::class, 'destroy']);

    Route::get('/tasks', [TasksController::class, 'index'])->name('tasks');
    Route::get('/library', [LibraryController::class, 'index'])->name('library');

    $stubs = ['notes', 'contacts', 'reviews'];
    foreach ($stubs as $module) {
        Route::get("/{$module}", fn() => Inertia::render('Stub/Index', ['module' => $module]))->name($module);
    }
});
