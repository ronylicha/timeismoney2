<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExpenseCategory;
use Illuminate\Http\Request;

class ExpenseCategoryController extends Controller
{
    /**
     * Display a listing of expense categories
     */
    public function index(Request $request)
    {
        $query = ExpenseCategory::where('tenant_id', auth()->user()->tenant_id);

        // Filter by active status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Search by name or description
        if ($request->has('search')) {
            $query->where(function($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        $categories = $query->orderBy('sort_order')->orderBy('name')->get();

        return response()->json($categories);
    }

    /**
     * Store a new expense category
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:expense_categories,code,NULL,id,tenant_id,' . auth()->user()->tenant_id,
            'description' => 'nullable|string|max:500',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:7', // hex color
            'is_active' => 'boolean',
            'is_billable_default' => 'boolean',
            'is_reimbursable_default' => 'boolean',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'sort_order' => 'nullable|integer|min:0'
        ]);

        $category = new ExpenseCategory($validated);
        $category->tenant_id = auth()->user()->tenant_id;
        $category->save();

        return response()->json([
            'message' => 'Catégorie de dépense créée avec succès',
            'data' => $category
        ], 201);
    }

    /**
     * Display the specified expense category
     */
    public function show(ExpenseCategory $expenseCategory)
    {
        // Check tenant access
        if ($expenseCategory->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        // Load expenses count
        $expenseCategory->loadCount('expenses');

        return response()->json([
            'data' => $expenseCategory
        ]);
    }

    /**
     * Update the specified expense category
     */
    public function update(Request $request, ExpenseCategory $expenseCategory)
    {
        // Check tenant access
        if ($expenseCategory->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'nullable|string|max:50|unique:expense_categories,code,' . $expenseCategory->id . ',id,tenant_id,' . auth()->user()->tenant_id,
            'description' => 'nullable|string|max:500',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:7',
            'is_active' => 'boolean',
            'is_billable_default' => 'boolean',
            'is_reimbursable_default' => 'boolean',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'sort_order' => 'nullable|integer|min:0'
        ]);

        $expenseCategory->update($validated);

        return response()->json([
            'message' => 'Catégorie de dépense mise à jour avec succès',
            'data' => $expenseCategory->fresh()
        ]);
    }

    /**
     * Remove the specified expense category
     */
    public function destroy(ExpenseCategory $expenseCategory)
    {
        // Check tenant access
        if ($expenseCategory->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        // Check if category has expenses
        if ($expenseCategory->expenses()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer une catégorie contenant des dépenses'
            ], 422);
        }

        $expenseCategory->delete();

        return response()->json(['message' => 'Catégorie de dépense supprimée avec succès']);
    }
}