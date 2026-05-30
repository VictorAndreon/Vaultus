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
use App\Http\Controllers\Dev\DesignShowcaseController;
use Illuminate\Support\Facades\Route;

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

    // Finance — leitura
    Route::get('/finance', [FinanceController::class, 'index'])->name('finance');
    Route::get('/finance/accounts/{account}', [AccountController::class, 'show']);
    Route::get('/finance/transactions', [TransactionController::class, 'index'])->name('finance.transactions');
    Route::get('/finance/reports', [\App\Domains\Finance\Controllers\ReportController::class, 'byCategory'])->name('finance.reports');
    Route::get('/finance/reports/export.csv', [\App\Domains\Finance\Controllers\ReportController::class, 'exportCsv'])->name('finance.reports.export');
    Route::get('/finance/recurring', [\App\Domains\Finance\Controllers\RecurringRuleController::class, 'index'])->name('finance.recurring');
    Route::get('/finance/cards', [\App\Domains\Finance\Controllers\CardsController::class, 'index'])->name('finance.cards');
    Route::get('/finance/accounts/{account}/statement', [\App\Domains\Finance\Controllers\StatementController::class, 'show'])->name('finance.statement');

    // Finance — escritas POST sob middleware de idempotência (protege contra clique-duplo / replay)
    Route::middleware('idempotent')->group(function () {
        Route::post('/finance/accounts', [AccountController::class, 'store']);
        Route::post('/finance/accounts/{account}/transactions', [TransactionController::class, 'store']);
        Route::post('/finance/goals', [GoalController::class, 'store']);
        Route::post('/finance/goals/{goal}/deposit', [GoalController::class, 'deposit']);
        Route::post('/finance/wishlist', [WishlistController::class, 'store']);
        Route::post('/finance/budget-categories', [\App\Domains\Finance\Controllers\BudgetCategoryController::class, 'store']);
        Route::post('/finance/upcoming-payments', [\App\Domains\Finance\Controllers\UpcomingPaymentController::class, 'store']);
        Route::post('/finance/recurring', [\App\Domains\Finance\Controllers\RecurringRuleController::class, 'store']);
        Route::post('/finance/installment-plans', [\App\Domains\Finance\Controllers\InstallmentPlanController::class, 'store']);
    });

    // Finance — atualizações e remoções (já idempotentes por contrato HTTP)
    Route::patch('/finance/accounts/{account}', [AccountController::class, 'update']);
    Route::delete('/finance/accounts/{account}', [AccountController::class, 'destroy']);
    Route::patch('/finance/transactions/{transaction}', [TransactionController::class, 'update']);
    Route::delete('/finance/transactions/{transaction}', [TransactionController::class, 'destroy']);
    Route::patch('/finance/goals/{goal}', [GoalController::class, 'update']);
    Route::delete('/finance/goals/{goal}', [GoalController::class, 'destroy']);
    Route::patch('/finance/wishlist/{item}', [WishlistController::class, 'update']);
    Route::delete('/finance/wishlist/{item}', [WishlistController::class, 'destroy']);
    Route::put('/finance/budget-categories/batch', [\App\Domains\Finance\Controllers\BudgetCategoryController::class, 'batch']);
    Route::patch('/finance/budget-categories/{category}', [\App\Domains\Finance\Controllers\BudgetCategoryController::class, 'update']);
    Route::delete('/finance/budget-categories/{category}', [\App\Domains\Finance\Controllers\BudgetCategoryController::class, 'destroy']);
    Route::patch('/finance/upcoming-payments/{payment}', [\App\Domains\Finance\Controllers\UpcomingPaymentController::class, 'update']);
    Route::delete('/finance/upcoming-payments/{payment}', [\App\Domains\Finance\Controllers\UpcomingPaymentController::class, 'destroy']);
    Route::patch('/finance/recurring/{rule}', [\App\Domains\Finance\Controllers\RecurringRuleController::class, 'update']);
    Route::delete('/finance/recurring/{rule}', [\App\Domains\Finance\Controllers\RecurringRuleController::class, 'destroy']);
    Route::delete('/finance/installment-plans/{plan}', [\App\Domains\Finance\Controllers\InstallmentPlanController::class, 'destroy']);
    Route::patch('/finance/settings', [\App\Domains\Finance\Controllers\FinanceController::class, 'updateSettings']);
    // Rotas de alocação de transação a meta — desativadas em 2026-05-16.
    // Substituídas pelo fluxo de aporte como transferência interna (POST /finance/goals/{goal}/deposit).
    // Mantidas comentadas como registro da migração; ver TransactionGoalController para detalhes.
    // Route::post('/finance/transactions/{transaction}/allocations', [TransactionGoalController::class, 'store']);
    // Route::delete('/finance/allocations/{allocation}', [TransactionGoalController::class, 'destroy']);

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
    Route::post('/library', [LibraryController::class, 'store']);

    Route::get('/notes', [\App\Domains\Notes\Controllers\NotesController::class, 'index'])->name('notes');
    Route::post('/notes', [\App\Domains\Notes\Controllers\NotesController::class, 'store']);
    Route::patch('/notes/{note}', [\App\Domains\Notes\Controllers\NotesController::class, 'update']);
    Route::delete('/notes/{note}', [\App\Domains\Notes\Controllers\NotesController::class, 'destroy']);

    Route::get('/contacts', [\App\Domains\Contacts\Controllers\ContactsController::class, 'index'])->name('contacts');
    Route::post('/contacts', [\App\Domains\Contacts\Controllers\ContactsController::class, 'store']);
    Route::patch('/contacts/{contact}', [\App\Domains\Contacts\Controllers\ContactsController::class, 'update']);
    Route::delete('/contacts/{contact}', [\App\Domains\Contacts\Controllers\ContactsController::class, 'destroy']);

    Route::get('/reviews', [\App\Domains\Reviews\Controllers\ReviewsController::class, 'index'])->name('reviews');
    Route::post('/reviews', [\App\Domains\Reviews\Controllers\ReviewsController::class, 'store']);
    Route::patch('/reviews/{review}', [\App\Domains\Reviews\Controllers\ReviewsController::class, 'update']);
    Route::delete('/reviews/{review}', [\App\Domains\Reviews\Controllers\ReviewsController::class, 'destroy']);

    // Dev — apenas ambiente local
    if (app()->environment('local')) {
        Route::get('/dev/design', [DesignShowcaseController::class, 'index'])
            ->name('dev.design');
    }
});
