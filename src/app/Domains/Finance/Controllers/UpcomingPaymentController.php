<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Models\UpcomingPayment;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class UpcomingPaymentController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'description'    => 'required|string|max:255',
            'amount'         => 'required|numeric|min:0.01',
            'due_date'       => 'required|date_format:Y-m-d',
            'tag'            => 'nullable|in:meta',
            'linked_goal_id' => 'nullable|exists:financial_goals,id',
        ]);

        $request->user()->upcomingPayments()->create([
            'description'      => $data['description'],
            'amount_encrypted' => $data['amount'],
            'due_date'         => $data['due_date'],
            'tag'              => $data['tag'] ?? null,
            'linked_goal_id'   => $data['linked_goal_id'] ?? null,
        ]);

        return back();
    }

    public function update(Request $request, UpcomingPayment $payment)
    {
        abort_if($payment->user_id !== $request->user()->id, 403);

        $data = $request->validate([
            'description'    => 'sometimes|string|max:255',
            'amount'         => 'sometimes|numeric|min:0.01',
            'due_date'       => 'sometimes|date_format:Y-m-d',
            'tag'            => 'nullable|in:meta',
            'linked_goal_id' => 'nullable|exists:financial_goals,id',
        ]);

        if (isset($data['amount'])) {
            $data['amount_encrypted'] = $data['amount'];
            unset($data['amount']);
        }

        $payment->update($data);

        return back();
    }

    public function destroy(Request $request, UpcomingPayment $payment)
    {
        abort_if($payment->user_id !== $request->user()->id, 403);
        $payment->delete();
        return back();
    }
}
