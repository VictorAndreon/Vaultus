<?php

namespace App\Providers;

use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\BudgetCategory;
use App\Domains\Finance\Models\FinancialGoal;
use App\Domains\Finance\Models\Transaction;
use App\Domains\Finance\Models\TransactionGoal;
use App\Domains\Finance\Models\UpcomingPayment;
use App\Domains\Finance\Observers\FinanceAuditObserver;
use Illuminate\Support\ServiceProvider;
use Laravel\Horizon\Horizon;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Horizon::auth(function ($request) {
            return $request->user() !== null;
        });

        Account::observe(FinanceAuditObserver::class);
        Transaction::observe(FinanceAuditObserver::class);
        FinancialGoal::observe(FinanceAuditObserver::class);
        TransactionGoal::observe(FinanceAuditObserver::class);
        BudgetCategory::observe(FinanceAuditObserver::class);
        UpcomingPayment::observe(FinanceAuditObserver::class);
    }
}
