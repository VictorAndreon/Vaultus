<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\FinancialGoal;
use App\Domains\Finance\Services\GoalDepositService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\Rule;

class GoalController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'            => 'required|string|max:255',
            'target_amount'   => 'required|numeric|min:0.01',
            'monthly_amount'  => 'nullable|numeric|min:0',
            'icon'            => 'nullable|string|max:20',
            'color'           => 'nullable|string|max:60',
            'note'            => 'nullable|string|max:255',
            'category'        => 'nullable|string|max:100',
            'deadline'        => 'nullable|date_format:Y-m',
        ]);

        $deadlineDate = isset($validated['deadline'])
            ? \Carbon\Carbon::createFromFormat('Y-m', $validated['deadline'])->endOfMonth()->toDateString()
            : null;

        $request->user()->financialGoals()->create([
            'name'                     => $validated['name'],
            'target_amount_encrypted'  => $validated['target_amount'],
            'monthly_amount_encrypted' => $validated['monthly_amount'] ?? 0,
            'icon'                     => $validated['icon'] ?? 'Shield',
            'color'                    => $validated['color'] ?? 'var(--green)',
            'note'                     => $validated['note'] ?? null,
            'category'                 => $validated['category'] ?? null,
            'deadline'                 => $deadlineDate,
            'status'                   => 'no-prazo',
        ]);

        return back();
    }

    public function update(Request $request, FinancialGoal $goal)
    {
        abort_if($goal->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'name'           => 'sometimes|string|max:255',
            'target_amount'  => 'sometimes|numeric|min:0.01',
            'monthly_amount' => 'nullable|numeric|min:0',
            'icon'           => 'nullable|string|max:20',
            'color'          => 'nullable|string|max:60',
            'note'           => 'nullable|string|max:255',
            'category'       => 'nullable|string|max:100',
            'deadline'       => 'nullable|date_format:Y-m',
            'is_completed'   => 'sometimes|boolean',
            'is_archived'    => 'sometimes|boolean',
        ]);

        $data = [];
        if (isset($validated['target_amount']))  $data['target_amount_encrypted']  = $validated['target_amount'];
        if (isset($validated['monthly_amount'])) $data['monthly_amount_encrypted'] = $validated['monthly_amount'];
        if (array_key_exists('icon', $validated))     $data['icon']     = $validated['icon'];
        if (array_key_exists('color', $validated))    $data['color']    = $validated['color'];
        if (array_key_exists('note', $validated))     $data['note']     = $validated['note'];
        if (array_key_exists('category', $validated)) $data['category'] = $validated['category'];
        if (isset($validated['name']))         $data['name']         = $validated['name'];
        if (isset($validated['is_completed'])) $data['is_completed'] = $validated['is_completed'];
        if (isset($validated['is_archived']))  $data['is_archived']  = $validated['is_archived'];
        if (array_key_exists('deadline', $validated)) {
            $data['deadline'] = $validated['deadline']
                ? \Carbon\Carbon::createFromFormat('Y-m', $validated['deadline'])->endOfMonth()->toDateString()
                : null;
        }

        $goal->update($data);

        return back();
    }

    public function destroy(Request $request, FinancialGoal $goal)
    {
        abort_if($goal->user_id !== $request->user()->id, 403);

        $goal->delete();

        return back();
    }

    public function deposit(Request $request, FinancialGoal $goal, GoalDepositService $service)
    {
        abort_if($goal->user_id !== $request->user()->id, 403);

        $userId = $request->user()->id;
        $data = $request->validate([
            'amount'      => 'required|numeric|min:0.01',
            'account_id'  => ['required', 'integer', Rule::exists('accounts', 'id')->where('user_id', $userId)],
            'occurred_at' => 'nullable|date_format:Y-m-d',
            'note'        => 'nullable|string|max:255',
        ]);

        $source = Account::findOrFail($data['account_id']);

        $service->deposit(
            goal:       $goal,
            source:     $source,
            amount:     (float) $data['amount'],
            occurredAt: $data['occurred_at'] ?? null,
            note:       $data['note']        ?? null,
        );

        return back();
    }
}
