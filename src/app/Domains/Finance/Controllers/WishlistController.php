<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Models\WishlistItem;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\Rule;

class WishlistController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                      => 'required|string|max:255',
            'estimated_price_encrypted' => 'nullable|numeric|min:0',
            'priority'                  => 'required|in:low,medium,high',
            'url'                       => 'nullable|url|max:500',
            'notes'                     => 'nullable|string|max:1000',
            'financial_goal_id'         => ['nullable', Rule::exists('financial_goals', 'id')->where('user_id', $request->user()->id)],
        ]);

        $request->user()->wishlistItems()->create($validated);

        return back();
    }

    public function update(Request $request, WishlistItem $item)
    {
        abort_if($item->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'name'                      => 'sometimes|string|max:255',
            'estimated_price_encrypted' => 'nullable|numeric|min:0',
            'priority'                  => 'sometimes|in:low,medium,high',
            'url'                       => 'nullable|url|max:500',
            'notes'                     => 'nullable|string|max:1000',
            'financial_goal_id'         => ['nullable', Rule::exists('financial_goals', 'id')->where('user_id', $request->user()->id)],
        ]);

        $item->update($validated);

        return back();
    }

    public function destroy(Request $request, WishlistItem $item)
    {
        abort_if($item->user_id !== $request->user()->id, 403);

        $item->delete();

        return back();
    }
}
