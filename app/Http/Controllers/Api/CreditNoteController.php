<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CreditNote;
use App\Models\CreditNoteItem;
use App\Models\Invoice;
use App\Services\PdfGeneratorService;
use App\Jobs\SendTransactionalEmailJob;
use App\Services\FacturXService;
use App\Services\CreditNoteService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class CreditNoteController extends Controller
{
    /**
     * Display a listing of credit notes
     */
    public function index(Request $request)
    {
        $query = CreditNote::with(['client', 'invoice', 'tenant'])
            ->where('tenant_id', auth()->user()->tenant_id);

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('credit_note_number', 'like', "%{$search}%")
                  ->orWhere('reason', 'like', "%{$search}%")
                  ->orWhereHas('client', function($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  });
            });
        }

        // Status filter
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Client filter
        if ($request->has('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        // Invoice filter
        if ($request->has('invoice_id')) {
            $query->where('invoice_id', $request->invoice_id);
        }

        // Date range filter
        if ($request->has('date_from')) {
            $query->whereDate('credit_note_date', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->whereDate('credit_note_date', '<=', $request->date_to);
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'credit_note_date');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $creditNotes = $query->paginate($request->get('per_page', 15));

        return response()->json($creditNotes);
    }

    /**
     * Store a newly created credit note
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'client_id' => 'required|exists:clients,id',
            'invoice_id' => 'nullable|exists:invoices,id',
            'credit_note_date' => 'required|date',
            'reason' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'payment_method' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.details' => 'nullable|string',
            'items.*.quantity' => 'required|numeric|min:0',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $tenant = auth()->user()->tenant;

            // Generate credit note number
            $creditNoteNumber = CreditNote::generateNumber($tenant->id);

            // Calculate totals
            $subtotal = 0;
            $totalTax = 0;

            foreach ($request->items as $item) {
                $itemTotal = $item['quantity'] * $item['unit_price'];
                $subtotal += $itemTotal;

                if (isset($item['tax_rate'])) {
                    $totalTax += ($itemTotal * $item['tax_rate']) / 100;
                }
            }

            $discount = $request->discount ?? 0;
            $total = $subtotal + $totalTax - $discount;

            // Create credit note
            $creditNote = CreditNote::create([
                'tenant_id' => $tenant->id,
                'client_id' => $request->client_id,
                'invoice_id' => $request->invoice_id,
                'credit_note_number' => $creditNoteNumber,
                'credit_note_date' => $request->credit_note_date,
                'reason' => $request->reason,
                'description' => $request->description,
                'status' => 'draft',
                'subtotal' => $subtotal,
                'tax' => $totalTax,
                'discount' => $discount,
                'total' => $total,
                'currency' => 'EUR',
                'payment_method' => $request->payment_method,
                'notes' => $request->notes,
            ]);

            // Create credit note items
            foreach ($request->items as $index => $item) {
                $itemTotal = $item['quantity'] * $item['unit_price'];
                $taxRate = $item['tax_rate'] ?? 0;
                $taxAmount = ($itemTotal * $taxRate) / 100;

                CreditNoteItem::create([
                    'credit_note_id' => $creditNote->id,
                    'description' => $item['description'],
                    'details' => $item['details'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'tax_rate' => $taxRate,
                    'tax_amount' => $taxAmount,
                    'total' => $itemTotal,
                    'position' => $index + 1,
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Credit note created successfully',
                'data' => $creditNote->load(['client', 'invoice', 'items'])
            ], 201);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'message' => 'Failed to create credit note',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified credit note
     */
    public function show($id)
    {
        $creditNote = CreditNote::with(['client', 'invoice', 'items', 'tenant'])
            ->where('tenant_id', auth()->user()->tenant_id)
            ->findOrFail($id);

        return response()->json([
            'data' => $creditNote
        ]);
    }

    /**
     * Update the specified credit note
     */
    public function update(Request $request, $id)
    {
        $creditNote = CreditNote::where('tenant_id', auth()->user()->tenant_id)
            ->findOrFail($id);

        // Cannot edit issued credit notes
        if (in_array($creditNote->status, ['issued', 'applied'])) {
            return response()->json([
                'message' => 'Cannot edit credit note in current status'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'credit_note_date' => 'sometimes|required|date',
            'reason' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'payment_method' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'items' => 'sometimes|required|array|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Update credit note
            $creditNote->update($request->only([
                'credit_note_date', 'reason', 'description', 'payment_method', 'notes'
            ]));

            // Update items if provided
            if ($request->has('items')) {
                $creditNote->items()->delete();

                $subtotal = 0;
                $totalTax = 0;

                foreach ($request->items as $index => $item) {
                    $itemTotal = $item['quantity'] * $item['unit_price'];
                    $taxRate = $item['tax_rate'] ?? 0;
                    $taxAmount = ($itemTotal * $taxRate) / 100;

                    $subtotal += $itemTotal;
                    $totalTax += $taxAmount;

                    CreditNoteItem::create([
                        'credit_note_id' => $creditNote->id,
                        'description' => $item['description'],
                        'details' => $item['details'] ?? null,
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price'],
                        'tax_rate' => $taxRate,
                        'tax_amount' => $taxAmount,
                        'total' => $itemTotal,
                        'position' => $index + 1,
                    ]);
                }

                $discount = $request->discount ?? $creditNote->discount ?? 0;

                $creditNote->update([
                    'subtotal' => $subtotal,
                    'tax' => $totalTax,
                    'discount' => $discount,
                    'total' => $subtotal + $totalTax - $discount,
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Credit note updated successfully',
                'data' => $creditNote->load(['client', 'invoice', 'items'])
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'message' => 'Failed to update credit note',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified credit note
     */
    public function destroy($id)
    {
        $creditNote = CreditNote::where('tenant_id', auth()->user()->tenant_id)
            ->findOrFail($id);

        // Cannot delete issued/applied credit notes
        if (in_array($creditNote->status, ['issued', 'applied'])) {
            return response()->json([
                'message' => 'Cannot delete credit note in current status (NF525 compliance)'
            ], 403);
        }

        $creditNote->delete();

        return response()->json([
            'message' => 'Credit note deleted successfully'
        ]);
    }

    /**
     * Issue credit note
     */
    public function issue(Request $request, $id)
    {
        $creditNote = CreditNote::where('tenant_id', auth()->user()->tenant_id)
            ->findOrFail($id);

        if ($creditNote->status !== 'draft') {
            return response()->json([
                'message' => 'Credit note must be in draft status to issue'
            ], 400);
        }

        $validated = $request->validate([
            'send_email' => 'nullable|boolean',
            'recipient_email' => 'nullable|email'
        ]);

        DB::beginTransaction();
        try {
            // Mark as issued and generate compliance hash
            $creditNote->markAsIssued();

            // Send email if requested
            if ($validated['send_email'] ?? true) {
                $targetEmail = $validated['recipient_email'] ?? $creditNote->client?->email;

                if ($targetEmail) {
                    SendTransactionalEmailJob::dispatch('credit_note', $creditNote->id, [], $validated['recipient_email'] ?? null);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Credit note issued successfully',
                'data' => $creditNote->load(['client', 'invoice', 'items'])
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'message' => 'Failed to issue credit note',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Send credit note email
     */
    public function send(Request $request, $id)
    {
        $creditNote = CreditNote::where('tenant_id', auth()->user()->tenant_id)
            ->findOrFail($id);

        $validated = $request->validate([
            'recipient_email' => 'nullable|email'
        ]);

        $targetEmail = $validated['recipient_email'] ?? $creditNote->client?->email;

        if (!$targetEmail) {
            return response()->json([
                'message' => 'Failed to queue credit note. Please check the client email address.',
                'error' => 'email_missing'
            ], 422);
        }

        SendTransactionalEmailJob::dispatch('credit_note', $creditNote->id, [], $validated['recipient_email'] ?? null);

        return response()->json([
            'message' => 'Credit note email queued successfully'
        ]);
    }

    /**
     * Download credit note PDF
     */
    public function downloadPdf($id, PdfGeneratorService $pdfService)
    {
        $creditNote = CreditNote::where('tenant_id', auth()->user()->tenant_id)
            ->findOrFail($id);

        return $pdfService->generateCreditNotePdf($creditNote, download: true);
    }

    /**
     * Apply credit note to invoice
     */
    public function apply(Request $request, $id)
    {
        $creditNote = CreditNote::where('tenant_id', auth()->user()->tenant_id)
            ->findOrFail($id);

        if ($creditNote->status !== 'issued') {
            return response()->json([
                'message' => 'Credit note must be issued to apply'
            ], 400);
        }

        $validated = $request->validate([
            'invoice_id' => 'required|exists:invoices,id'
        ]);

        DB::beginTransaction();
        try {
            $invoice = Invoice::where('tenant_id', auth()->user()->tenant_id)
                ->findOrFail($validated['invoice_id']);

            // Update credit note
            $creditNote->update([
                'status' => 'applied',
                'invoice_id' => $invoice->id
            ]);

            // Apply credit to invoice (would need additional logic in production)
            // This is simplified - in production you'd track partial applications, etc.

            DB::commit();

            return response()->json([
                'message' => 'Credit note applied successfully',
                'data' => $creditNote->load(['client', 'invoice', 'items'])
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'message' => 'Failed to apply credit note',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create credit note from invoice (alternative route)
     */
    public function createFromInvoice(Request $request, CreditNoteService $creditNoteService)
    {
        $validated = $request->validate([
            'invoice_id' => 'required|exists:invoices,id',
            'reason' => 'required|string|max:500',
            'full_credit' => 'boolean',
            'items' => 'array',
            'items.*.id' => 'exists:invoice_items,id',
            'items.*.quantity' => 'numeric|min:0'
        ]);
        
        try {
            $invoice = Invoice::where('tenant_id', auth()->user()->tenant_id)
                ->findOrFail($validated['invoice_id']);
            
            $creditNote = $creditNoteService->createFromInvoice(
                $invoice,
                $validated['items'] ?? [],
                $validated['full_credit'] ?? true,
                $validated['reason']
            );
            
            return response()->json([
                'message' => 'Avoir créé avec succès',
                'data' => $creditNote->load(['client', 'invoice', 'items'])
            ], 201);
            
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Échec de création de l\'avoir',
                'error' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Download credit note as FacturX (PDF + embedded XML)
     */
    public function downloadFacturX($id, FacturXService $facturXService)
    {
        $creditNote = CreditNote::where('tenant_id', auth()->user()->tenant_id)
            ->findOrFail($id);

        // Generate if doesn't exist
        if (!$creditNote->facturx_path) {
            $path = $facturXService->generateFacturXForCreditNote($creditNote);
            $creditNote->update([
                'facturx_path' => $path,
                'facturx_generated_at' => now(),
                'electronic_format' => 'facturx'
            ]);
        }

        return Storage::download($creditNote->facturx_path);
    }

    /**
     * Generate FacturX for credit note
     */
    public function generateFacturX($id, FacturXService $facturXService)
    {
        $creditNote = CreditNote::where('tenant_id', auth()->user()->tenant_id)
            ->findOrFail($id);

        try {
            // Force regeneration
            $path = $facturXService->generateFacturXForCreditNote($creditNote);
            
            $creditNote->update([
                'facturx_path' => $path,
                'facturx_generated_at' => now(),
                'electronic_format' => 'facturx'
            ]);

            return response()->json([
                'message' => 'FacturX généré avec succès',
                'path' => $path
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Échec de génération FacturX',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
