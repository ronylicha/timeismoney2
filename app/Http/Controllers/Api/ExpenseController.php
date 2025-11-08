<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ExpenseController extends Controller
{
    /**
     * Display a listing of expenses
     */
    public function index(Request $request)
    {
        $query = Expense::with(['user', 'project', 'category'])
            ->where('tenant_id', auth()->user()->tenant_id);

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by project
        if ($request->has('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        // Filter by date range
        if ($request->has('start_date')) {
            $query->whereDate('expense_date', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->whereDate('expense_date', '<=', $request->end_date);
        }

        // Search
        if ($request->has('search')) {
            $query->where(function($q) use ($request) {
                $q->where('description', 'like', '%' . $request->search . '%')
                  ->orWhere('merchant', 'like', '%' . $request->search . '%');
            });
        }

        $expenses = $query->latest('expense_date')->paginate(20);

        return response()->json($expenses);
    }

    /**
     * Store a new expense
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'description' => 'required|string|max:500',
            'amount' => 'required|numeric|min:0',
            'expense_date' => 'required|date',
            'category' => 'required|string',
            'merchant' => 'nullable|string|max:255',
            'project_id' => 'nullable|exists:projects,id',
            'billable' => 'boolean',
            'notes' => 'nullable|string|max:1000',
            'receipt' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120', // 5MB max
        ]);

        $expense = new Expense($validated);
        $expense->tenant_id = auth()->user()->tenant_id;
        $expense->user_id = auth()->id();
        $expense->status = 'pending';

        // Handle receipt upload
        if ($request->hasFile('receipt')) {
            $path = $request->file('receipt')->store('receipts', 'public');
            $expense->receipt_path = $path;
        }

        $expense->save();

        return response()->json([
            'message' => 'Expense created successfully',
            'data' => $expense->load(['user', 'project', 'category'])
        ], 201);
    }

    /**
     * Display the specified expense
     */
    public function show(Expense $expense)
    {
        // Check tenant access
        if ($expense->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'data' => $expense->load(['user', 'project', 'category', 'approver'])
        ]);
    }

    /**
     * Update the specified expense
     */
    public function update(Request $request, Expense $expense)
    {
        // Check tenant access
        if ($expense->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Only allow updates if pending
        if ($expense->status !== 'pending') {
            return response()->json([
                'message' => 'Cannot update expense that is not pending'
            ], 422);
        }

        $validated = $request->validate([
            'description' => 'sometimes|string|max:500',
            'amount' => 'sometimes|numeric|min:0',
            'expense_date' => 'sometimes|date',
            'category' => 'sometimes|string',
            'merchant' => 'nullable|string|max:255',
            'project_id' => 'nullable|exists:projects,id',
            'billable' => 'boolean',
            'notes' => 'nullable|string|max:1000',
        ]);

        $expense->update($validated);

        return response()->json([
            'message' => 'Expense updated successfully',
            'data' => $expense->fresh()->load(['user', 'project', 'category'])
        ]);
    }

    /**
     * Remove the specified expense
     */
    public function destroy(Expense $expense)
    {
        // Check tenant access
        if ($expense->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Only allow deletion if pending
        if ($expense->status !== 'pending') {
            return response()->json([
                'message' => 'Cannot delete expense that is not pending'
            ], 422);
        }

        // Delete receipt file if exists
        if ($expense->receipt_path) {
            Storage::disk('public')->delete($expense->receipt_path);
        }

        $expense->delete();

        return response()->json(['message' => 'Expense deleted successfully']);
    }

    /**
     * Approve an expense
     */
    public function approve(Request $request, Expense $expense)
    {
        // Check tenant access
        if ($expense->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Check if user has permission to approve
        if (!auth()->user()->hasPermission('approve_expenses')) {
            return response()->json(['message' => 'Insufficient permissions'], 403);
        }

        if ($expense->status !== 'pending') {
            return response()->json([
                'message' => 'Expense is not pending approval'
            ], 422);
        }

        $expense->update([
            'status' => 'approved',
            'approved_by' => auth()->id(),
            'approved_at' => now(),
        ]);

        return response()->json([
            'message' => 'Expense approved successfully',
            'data' => $expense->fresh()->load(['user', 'project', 'approver'])
        ]);
    }

    /**
     * Attach or update receipt for an expense
     */
    public function attachReceipt(Request $request, Expense $expense)
    {
        // Check tenant access
        if ($expense->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'receipt' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120', // 5MB max
        ]);

        // Delete old receipt if exists
        if ($expense->receipt_path) {
            Storage::disk('public')->delete($expense->receipt_path);
        }

        // Store new receipt
        $path = $request->file('receipt')->store('receipts', 'public');
        $expense->update(['receipt_path' => $path]);

        return response()->json([
            'message' => 'Receipt attached successfully',
            'data' => $expense->fresh()
        ]);
    }
}
