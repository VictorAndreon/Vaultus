<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Models\FinancialGoal;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class GoalController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                   => 'required|string|max:255',
            'target_amount_encrypted' => 'required|numeric|min:0.01',
            'category'               => 'nullable|string|max:100',
            'deadline'               => 'nullable|date_format:Y-m-d',
        ]);

        $request->user()->financialGoals()->create($validated);

        return back();
    }

    public function update(Request $request, FinancialGoal $goal)
    {
        abort_if($goal->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'name'                   => 'sometimes|string|max:255',
            'target_amount_encrypted' => 'sometimes|numeric|min:0.01',
            'category'               => 'nullable|string|max:100',
            'deadline'               => 'nullable|date_format:Y-m-d',
            'is_completed'           => 'sometimes|boolean',
            'is_archived'            => 'sometimes|boolean',
        ]);

        $goal->update($validated);

        return back();
    }

    public function destroy(Request $request, FinancialGoal $goal)
    {
        abort_if($goal->user_id !== $request->user()->id, 403);

        $goal->delete();

        return back();
    }
}
