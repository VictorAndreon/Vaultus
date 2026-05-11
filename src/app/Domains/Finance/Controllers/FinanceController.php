<?php

namespace App\Domains\Finance\Controllers;

use App\Http\Resources\AccountResource;
use App\Http\Resources\FinancialGoalResource;
use App\Http\Resources\WishlistItemResource;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;

class FinanceController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $accounts = $user->accounts()->with('transactions')->get();

        return Inertia::render('Finance/Index', [
            'accounts'  => AccountResource::collection($accounts),
            'goals'     => FinancialGoalResource::collection($user->financialGoals()->with('transactionGoals')->get()),
            'wishlist'  => WishlistItemResource::collection($user->wishlistItems()->with('goal.transactionGoals')->get()),
            'net_worth' => (float) $accounts->sum(fn($a) => $a->current_balance),
        ]);
    }
}
