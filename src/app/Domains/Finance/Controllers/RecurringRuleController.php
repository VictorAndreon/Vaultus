<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Models\RecurringRule;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class RecurringRuleController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $rules = $user->recurringRules()->with('account')->orderByDesc('is_active')->orderBy('day_of_month')->get()
            ->map(fn (RecurringRule $r) => [
                'id'           => $r->id,
                'account_id'   => $r->account_id,
                'account_name' => $r->account?->name,
                'type'         => $r->type,
                'amount'       => (float) $r->amount_encrypted,
                'description'  => $r->description,
                'category'     => $r->category,
                'day_of_month' => $r->day_of_month,
                'starts_on'    => $r->starts_on?->toDateString(),
                'ends_on'      => $r->ends_on?->toDateString(),
                'last_run_on'  => $r->last_run_on?->toDateString(),
                'is_active'    => $r->is_active,
            ]);

        $accounts = $user->accounts()->userVisible()->get(['id', 'name', 'type']);

        return Inertia::render('Finance/Recurring', [
            'rules'    => $rules,
            'accounts' => $accounts,
        ]);
    }

    public function store(Request $request)
    {
        $userId = $request->user()->id;
        $validated = $request->validate([
            'account_id'       => ['required', Rule::exists('accounts', 'id')->where('user_id', $userId)],
            'type'             => 'required|in:income,expense',
            'amount'           => 'sometimes|numeric|min:0.01',
            'amount_encrypted' => 'sometimes|numeric|min:0.01',
            'description'      => 'required|string|max:255',
            'category'         => 'nullable|string|max:100',
            'day_of_month'     => 'required|integer|min:1|max:31',
            'starts_on'        => 'required|date_format:Y-m-d',
            'ends_on'          => 'nullable|date_format:Y-m-d|after_or_equal:starts_on',
            'is_active'        => 'sometimes|boolean',
        ]);

        $amount = $validated['amount'] ?? $validated['amount_encrypted'] ?? null;
        abort_if($amount === null, 422, 'O campo valor é obrigatório.');
        $validated['amount_encrypted'] = $amount;
        unset($validated['amount']);

        $request->user()->recurringRules()->create($validated);

        return back();
    }

    public function update(Request $request, RecurringRule $rule)
    {
        abort_if($rule->user_id !== $request->user()->id, 403);

        $userId = $request->user()->id;
        $validated = $request->validate([
            'account_id'       => ['sometimes', Rule::exists('accounts', 'id')->where('user_id', $userId)],
            'type'             => 'sometimes|in:income,expense',
            'amount'           => 'sometimes|numeric|min:0.01',
            'amount_encrypted' => 'sometimes|numeric|min:0.01',
            'description'      => 'sometimes|string|max:255',
            'category'         => 'nullable|string|max:100',
            'day_of_month'     => 'sometimes|integer|min:1|max:31',
            'starts_on'        => 'sometimes|date_format:Y-m-d',
            'ends_on'          => 'nullable|date_format:Y-m-d|after_or_equal:starts_on',
            'is_active'        => 'sometimes|boolean',
        ]);

        if (array_key_exists('amount', $validated)) {
            $validated['amount_encrypted'] = $validated['amount'];
            unset($validated['amount']);
        }

        $rule->update($validated);

        return back();
    }

    public function destroy(Request $request, RecurringRule $rule)
    {
        abort_if($rule->user_id !== $request->user()->id, 403);
        $rule->delete();
        return back();
    }
}
