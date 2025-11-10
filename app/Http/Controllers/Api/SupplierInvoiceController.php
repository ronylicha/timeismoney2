<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupplierInvoice;
use App\Models\SupplierInvoiceLine;
use App\Services\SupplierInvoiceService;
use App\Services\PdpService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

/**
 * Controller for managing supplier invoices via PDP
 */
class SupplierInvoiceController extends Controller
{
    private SupplierInvoiceService $supplierInvoiceService;

    public function __construct(SupplierInvoiceService $supplierInvoiceService)
    {
        $this->supplierInvoiceService = $supplierInvoiceService;
    }

    /**
     * Get all supplier invoices for current tenant
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $tenant = $user->tenant;

        $query = SupplierInvoice::where('tenant_id', $tenant->id)
            ->with(['lines']);

        // Apply filters
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('date_from')) {
            $query->whereDate('invoice_date', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('invoice_date', '<=', $request->date_to);
        }

        if ($request->has('supplier_name')) {
            $query->where('supplier_name', 'like', '%' . $request->supplier_name . '%');
        }

        $supplierInvoices = $query->orderBy('invoice_date', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json([
            'data' => $supplierInvoices,
        ]);
    }

    /**
     * Get a specific supplier invoice
     */
    public function show(SupplierInvoice $supplierInvoice): JsonResponse
    {
        $user = Auth::user();
        
        if ($supplierInvoice->tenant_id !== $user->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $supplierInvoice->load(['lines', 'pdpSubmissions']);

        return response()->json([
            'data' => $supplierInvoice,
        ]);
    }

    /**
     * Store a new supplier invoice
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();
        $tenant = $user->tenant;

        $validated = $request->validate([
            'supplier_name' => 'required|string|max:255',
            'supplier_siret' => 'nullable|string|max:50',
            'supplier_vat_number' => 'nullable|string|max:50',
            'supplier_address' => 'nullable|string|max:500',
            'invoice_number' => 'required|string|max:100',
            'invoice_date' => 'required|date',
            'due_date' => 'nullable|date|after_or_equal:invoice_date',
            'total_amount' => 'required|numeric|min:0',
            'vat_amount' => 'required|numeric|min:0',
            'currency' => 'required|string|size:3',
            'status' => 'required|in:received,pending,paid,cancelled',
            'notes' => 'nullable|string|max:1000',
            'lines' => 'required|array|min:1',
            'lines.*.description' => 'required|string|max:500',
            'lines.*.quantity' => 'required|numeric|min:0',
            'lines.*.unit_price' => 'required|numeric|min:0',
            'lines.*.vat_rate' => 'required|numeric|min:0|max:100',
            'lines.*.total_amount' => 'required|numeric|min:0',
        ]);

        try {
            DB::beginTransaction();

            $supplierInvoice = SupplierInvoice::create([
                'tenant_id' => $tenant->id,
                'supplier_name' => $validated['supplier_name'],
                'supplier_siret' => $validated['supplier_siret'],
                'supplier_vat_number' => $validated['supplier_vat_number'],
                'supplier_address' => $validated['supplier_address'],
                'invoice_number' => $validated['invoice_number'],
                'invoice_date' => $validated['invoice_date'],
                'due_date' => $validated['due_date'],
                'total_amount' => $validated['total_amount'],
                'vat_amount' => $validated['vat_amount'],
                'currency' => $validated['currency'],
                'status' => $validated['status'],
                'notes' => $validated['notes'],
                'created_by' => $user->id,
            ]);

            // Create invoice lines
            foreach ($validated['lines'] as $lineData) {
                SupplierInvoiceLine::create([
                    'supplier_invoice_id' => $supplierInvoice->id,
                    'description' => $lineData['description'],
                    'quantity' => $lineData['quantity'],
                    'unit_price' => $lineData['unit_price'],
                    'vat_rate' => $lineData['vat_rate'],
                    'total_amount' => $lineData['total_amount'],
                ]);
            }

            DB::commit();

            Log::info('Supplier invoice created', [
                'supplier_invoice_id' => $supplierInvoice->id,
                'invoice_number' => $supplierInvoice->invoice_number,
                'supplier_name' => $supplierInvoice->supplier_name,
                'total_amount' => $supplierInvoice->total_amount,
                'created_by' => $user->id,
            ]);

            return response()->json([
                'message' => 'Supplier invoice created successfully',
                'data' => $supplierInvoice->load(['lines']),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create supplier invoice', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
            ]);

            return response()->json([
                'message' => 'Failed to create supplier invoice',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update a supplier invoice
     */
    public function update(Request $request, SupplierInvoice $supplierInvoice): JsonResponse
    {
        $user = Auth::user();
        
        if ($supplierInvoice->tenant_id !== $user->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'supplier_name' => 'sometimes|required|string|max:255',
            'supplier_siret' => 'nullable|string|max:50',
            'supplier_vat_number' => 'nullable|string|max:50',
            'supplier_address' => 'nullable|string|max:500',
            'invoice_number' => 'sometimes|required|string|max:100',
            'invoice_date' => 'sometimes|required|date',
            'due_date' => 'nullable|date|after_or_equal:invoice_date',
            'total_amount' => 'sometimes|required|numeric|min:0',
            'vat_amount' => 'sometimes|required|numeric|min:0',
            'currency' => 'sometimes|required|string|size:3',
            'status' => 'sometimes|required|in:received,pending,paid,cancelled',
            'notes' => 'nullable|string|max:1000',
        ]);

        try {
            $supplierInvoice->update($validated);

            Log::info('Supplier invoice updated', [
                'supplier_invoice_id' => $supplierInvoice->id,
                'invoice_number' => $supplierInvoice->invoice_number,
                'updated_by' => $user->id,
            ]);

            return response()->json([
                'message' => 'Supplier invoice updated successfully',
                'data' => $supplierInvoice->load(['lines']),
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to update supplier invoice', [
                'supplier_invoice_id' => $supplierInvoice->id,
                'error' => $e->getMessage(),
                'user_id' => $user->id,
            ]);

            return response()->json([
                'message' => 'Failed to update supplier invoice',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a supplier invoice
     */
    public function destroy(SupplierInvoice $supplierInvoice): JsonResponse
    {
        $user = Auth::user();
        
        if ($supplierInvoice->tenant_id !== $user->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $supplierInvoice->delete();

            Log::info('Supplier invoice deleted', [
                'supplier_invoice_id' => $supplierInvoice->id,
                'invoice_number' => $supplierInvoice->invoice_number,
                'deleted_by' => $user->id,
            ]);

            return response()->json([
                'message' => 'Supplier invoice deleted successfully',
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to delete supplier invoice', [
                'supplier_invoice_id' => $supplierInvoice->id,
                'error' => $e->getMessage(),
                'user_id' => $user->id,
            ]);

            return response()->json([
                'message' => 'Failed to delete supplier invoice',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Submit supplier invoice to PDP
     */
    public function submitToPdp(SupplierInvoice $supplierInvoice): JsonResponse
    {
        $user = Auth::user();
        
        if ($supplierInvoice->tenant_id !== $user->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!$user->tenant->hasPdpConfigured()) {
            return response()->json([
                'message' => 'PDP is not configured for this tenant',
            ], 400);
        }

        try {
            $result = $this->supplierInvoiceService->submitToPdp($supplierInvoice);

            Log::info('Supplier invoice submitted to PDP', [
                'supplier_invoice_id' => $supplierInvoice->id,
                'invoice_number' => $supplierInvoice->invoice_number,
                'submission_id' => $result['submission_id'] ?? null,
                'submitted_by' => $user->id,
            ]);

            return response()->json([
                'message' => 'Supplier invoice submitted to PDP successfully',
                'data' => $result,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to submit supplier invoice to PDP', [
                'supplier_invoice_id' => $supplierInvoice->id,
                'error' => $e->getMessage(),
                'user_id' => $user->id,
            ]);

            return response()->json([
                'message' => 'Failed to submit supplier invoice to PDP',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get PDP submission status for a supplier invoice
     */
    public function getPdpStatus(SupplierInvoice $supplierInvoice): JsonResponse
    {
        $user = Auth::user();
        
        if ($supplierInvoice->tenant_id !== $user->tenant_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $status = $this->supplierInvoiceService->getPdpSubmissionStatus($supplierInvoice);

            return response()->json([
                'data' => $status,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to get PDP status for supplier invoice', [
                'supplier_invoice_id' => $supplierInvoice->id,
                'error' => $e->getMessage(),
                'user_id' => $user->id,
            ]);

            return response()->json([
                'message' => 'Failed to get PDP status',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get statistics for supplier invoices
     */
    public function getStats(Request $request): JsonResponse
    {
        $user = Auth::user();
        $tenant = $user->tenant;

        try {
            $stats = $this->supplierInvoiceService->getStats($tenant, $request->all());

            return response()->json([
                'data' => $stats,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to get supplier invoice stats', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
            ]);

            return response()->json([
                'message' => 'Failed to get statistics',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Import supplier invoices from PDP
     */
    public function importFromPdp(Request $request): JsonResponse
    {
        $user = Auth::user();
        $tenant = $user->tenant;

        if (!$tenant->hasPdpConfigured()) {
            return response()->json([
                'message' => 'PDP is not configured for this tenant',
            ], 400);
        }

        $validated = $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'status' => 'nullable|in:all,pending,accepted,rejected',
        ]);

        try {
            $result = $this->supplierInvoiceService->importFromPdp($tenant, $validated);

            Log::info('Supplier invoices imported from PDP', [
                'imported_count' => $result['imported_count'] ?? 0,
                'date_from' => $validated['date_from'],
                'date_to' => $validated['date_to'],
                'imported_by' => $user->id,
            ]);

            return response()->json([
                'message' => 'Supplier invoices imported from PDP successfully',
                'data' => $result,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to import supplier invoices from PDP', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
                'date_from' => $validated['date_from'],
                'date_to' => $validated['date_to'],
            ]);

            return response()->json([
                'message' => 'Failed to import supplier invoices from PDP',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}