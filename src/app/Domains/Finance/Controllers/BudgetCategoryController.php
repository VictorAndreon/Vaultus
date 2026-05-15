<?php
namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Models\BudgetCategory;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class BudgetCategoryController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'          => 'required|string|max:100',
            'budget_amount' => 'required|numeric|min:0',
            'color'         => 'nullable|string|max:60',
        ]);
        $request->user()->budgetCategories()->create([
            'name'                    => $data['name'],
            'budget_amount_encrypted' => $data['budget_amount'],
            'color'                   => $data['color'] ?? 'var(--green)',
        ]);
        return back();
    }

    public function update(Request $request, BudgetCategory $category)
    {
        abort_if($category->user_id !== $request->user()->id, 403);
        $data = $request->validate([
            'name'          => 'sometimes|string|max:100',
            'budget_amount' => 'sometimes|numeric|min:0',
            'color'         => 'nullable|string|max:60',
        ]);
        if (isset($data['budget_amount'])) {
            $data['budget_amount_encrypted'] = $data['budget_amount'];
            unset($data['budget_amount']);
        }
        $category->update($data);
        return back();
    }

    public function destroy(Request $request, BudgetCategory $category)
    {
        abort_if($category->user_id !== $request->user()->id, 403);
        $category->delete();
        return back();
    }

    public function batch(Request $request)
    {
        $data = $request->validate([
            'categories'              => 'required|array',
            'categories.*.id'         => 'nullable|integer',
            'categories.*.name'       => 'required|string|max:100',
            'categories.*.budget'     => 'required|numeric|min:0',
            'categories.*.color'      => 'nullable|string|max:60',
        ]);

        $user = $request->user();
        $incoming = collect($data['categories']);
        $incomingIds = $incoming->pluck('id')->filter()->values();

        // Excluir categorias removidas
        $user->budgetCategories()
            ->whereNotIn('id', $incomingIds)
            ->delete();

        // Upsert das categorias
        foreach ($incoming as $cat) {
            if (!empty($cat['id'])) {
                $existing = $user->budgetCategories()->find($cat['id']);
                if ($existing) {
                    $existing->update([
                        'name'                    => $cat['name'],
                        'budget_amount_encrypted' => $cat['budget'],
                        'color'                   => $cat['color'] ?? 'var(--green)',
                    ]);
                }
            } else {
                $user->budgetCategories()->create([
                    'name'                    => $cat['name'],
                    'budget_amount_encrypted' => $cat['budget'],
                    'color'                   => $cat['color'] ?? 'var(--green)',
                ]);
            }
        }

        return back();
    }
}
