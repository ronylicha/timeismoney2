<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Quote;
use App\Models\Client;
use App\Services\PdfGeneratorService;
use App\Jobs\SendTransactionalEmailJob;
use App\Mail\QuoteAccepted;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

class QuoteController extends Controller
{
    /**
     * Display a listing of quotes
     */
    public function index(Request $request)
    {
        $query = Quote::with(['client', 'tenant'])
            ->where('tenant_id', auth()->user()->tenant_id);

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('quote_number', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
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

        // Date range filter
        if ($request->has('date_from')) {
            $query->whereDate('quote_date', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->whereDate('quote_date', '<=', $request->date_to);
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $quotes = $query->paginate($request->get('per_page', 15));

        return response()->json($quotes);
    }

    /**
     * Store a newly created quote
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'client_id' => 'required|exists:clients,id',
            'description' => 'nullable|string',
            'quote_date' => 'nullable|date',
            'valid_until' => 'required|date',
            'notes' => 'nullable|string',
            'terms_conditions' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
            'items.*.discount' => 'nullable|numeric|min:0',
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

            // Generate quote number
            $lastQuote = Quote::where('tenant_id', $tenant->id)
                ->orderBy('id', 'desc')
                ->first();

            $nextNumber = $lastQuote ? (int)substr($lastQuote->quote_number, -4) + 1 : 1;
            $quoteNumber = sprintf('QT-%04d', $nextNumber);

            // Calculate totals
            $subtotal = 0;
            $totalTax = 0;

            foreach ($request->items as $item) {
                $itemSubtotal = $item['quantity'] * $item['unit_price'];
                $discount = $item['discount'] ?? 0;
                $itemSubtotal -= $discount;
                $subtotal += $itemSubtotal;

                if (isset($item['tax_rate'])) {
                    $totalTax += ($itemSubtotal * $item['tax_rate']) / 100;
                }
            }

            $total = $subtotal + $totalTax;

            // Create quote
            $quote = Quote::create([
                'tenant_id' => $tenant->id,
                'client_id' => $request->client_id,
                'quote_number' => $quoteNumber,
                'description' => $request->description,
                'quote_date' => $request->quote_date ?? now(),
                'valid_until' => $request->valid_until,
                'status' => 'draft',
                'subtotal' => $subtotal,
                'tax_amount' => $totalTax,
                'total' => $total,
                'notes' => $request->notes,
                'terms_conditions' => $request->terms_conditions,
                'created_by' => auth()->id(),
                'sequence_number' => $nextNumber,
            ]);

            // Create quote items
            foreach ($request->items as $position => $item) {
                $itemSubtotal = $item['quantity'] * $item['unit_price'];
                $discount = $item['discount'] ?? 0;
                $subtotalAfterDiscount = $itemSubtotal - $discount;
                $taxRate = $item['tax_rate'] ?? 0;
                $itemTaxAmount = $subtotalAfterDiscount * ($taxRate / 100);
                
                $quote->items()->create([
                    'type' => 'service',
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount_percent' => 0,
                    'tax_rate' => $taxRate,
                    'subtotal' => $subtotalAfterDiscount,
                    'tax_amount' => $itemTaxAmount,
                    'total' => $subtotalAfterDiscount + $itemTaxAmount,
                    'position' => $position,
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Quote created successfully',
                'data' => $quote->load(['client', 'items'])
            ], 201);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'message' => 'Failed to create quote',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified quote
     */
    public function show($id)
    {
        $quote = Quote::with(['client', 'items', 'tenant'])
            ->where('tenant_id', auth()->user()->tenant_id)
            ->findOrFail($id);

        return response()->json([
            'data' => $quote
        ]);
    }

    /**
     * Update the specified quote
     */
    public function update(Request $request, $id)
    {
        $quote = Quote::where('tenant_id', auth()->user()->tenant_id)
            ->findOrFail($id);

        // Cannot edit sent/accepted quotes
        if (in_array($quote->status, ['sent', 'accepted', 'converted'])) {
            return response()->json([
                'message' => 'Cannot edit quote in current status'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'client_id' => 'sometimes|required|exists:clients,id',
            'description' => 'nullable|string',
            'quote_date' => 'sometimes|required|date',
            'valid_until' => 'sometimes|required|date',
            'notes' => 'nullable|string',
            'terms_conditions' => 'nullable|string',
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
            // Update quote
            $quote->update($request->only([
                'client_id', 'description', 'quote_date', 'valid_until', 'notes', 'terms_conditions'
            ]));

            // Update items if provided
            if ($request->has('items')) {
                $quote->items()->delete();

                $subtotal = 0;
                $totalTax = 0;

                foreach ($request->items as $position => $item) {
                    $itemSubtotal = $item['quantity'] * $item['unit_price'];
                    $discount = $item['discount'] ?? 0;
                    $subtotalAfterDiscount = $itemSubtotal - $discount;
                    $subtotal += $subtotalAfterDiscount;

                    $taxRate = $item['tax_rate'] ?? 0;
                    $itemTaxAmount = $subtotalAfterDiscount * ($taxRate / 100);
                    $totalTax += $itemTaxAmount;

                    $quote->items()->create([
                        'type' => 'service',
                        'description' => $item['description'],
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price'],
                        'discount_percent' => 0,
                        'tax_rate' => $taxRate,
                        'subtotal' => $subtotalAfterDiscount,
                        'tax_amount' => $itemTaxAmount,
                        'total' => $subtotalAfterDiscount + $itemTaxAmount,
                        'position' => $position,
                    ]);
                }

                $quote->update([
                    'subtotal' => $subtotal,
                    'tax_amount' => $totalTax,
                    'total_amount' => $subtotal + $totalTax,
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Quote updated successfully',
                'data' => $quote->load(['client', 'items'])
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'message' => 'Failed to update quote',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified quote
     */
    public function destroy($id)
    {
        $quote = Quote::where('tenant_id', auth()->user()->tenant_id)
            ->findOrFail($id);

        // Cannot delete accepted/converted quotes
        if (in_array($quote->status, ['accepted', 'converted'])) {
            return response()->json([
                'message' => 'Cannot delete quote in current status'
            ], 403);
        }

        $quote->delete();

        return response()->json([
            'message' => 'Quote deleted successfully'
        ]);
    }

    /**
     * Send quote to client
     */
    public function send(Request $request, $id)
    {
        $quote = Quote::with(['client', 'tenant', 'items'])
            ->where('tenant_id', auth()->user()->tenant_id)
            ->findOrFail($id);

        if ($quote->status !== 'draft') {
            return response()->json([
                'message' => 'Quote must be in draft status to send'
            ], 400);
        }

        $validated = $request->validate([
            'recipient_email' => 'nullable|email'
        ]);

        $targetEmail = $validated['recipient_email'] ?? $quote->client?->email;

        if (!$targetEmail) {
            return response()->json([
                'message' => 'Failed to queue quote. Please check the client email address.',
                'error' => 'email_missing'
            ], 422);
        }

        SendTransactionalEmailJob::dispatch('quote', $quote->id, [], $validated['recipient_email'] ?? null);

        $quote->update([
            'status' => 'sent',
            'sent_at' => now()
        ]);

        return response()->json([
            'message' => 'Quote email queued successfully',
            'data' => $quote->load(['client', 'items'])
        ]);
    }

    /**
     * Accept quote
     */
    public function accept(Request $request, $id)
    {
        $quote = Quote::where('tenant_id', auth()->user()->tenant_id)
            ->findOrFail($id);

        if (!in_array($quote->status, ['draft', 'sent'])) {
            return response()->json([
                'message' => 'Quote must be draft or sent to be accepted'
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'signature' => 'required|string', // Base64 image data
            'signatory_name' => 'required|string|max:255',
            'accepted_terms' => 'required|boolean|accepted',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Save signature as file
        $signatureData = $request->signature;
        if (preg_match('/^data:image\/(\w+);base64,/', $signatureData, $type)) {
            $signatureData = substr($signatureData, strpos($signatureData, ',') + 1);
            $type = strtolower($type[1]); // jpg, png, gif

            $signatureData = base64_decode($signatureData);
            
            if ($signatureData === false) {
                return response()->json(['message' => 'Invalid signature data'], 400);
            }

            $fileName = 'signatures/quote_' . $quote->id . '_' . time() . '.' . $type;
            \Storage::disk('private')->put($fileName, $signatureData);

            $quote->update([
                'status' => 'accepted',
                'accepted_at' => now(),
                'signature_path' => $fileName,
                'signatory_name' => $request->signatory_name,
                'signature_ip' => $request->ip(),
                'signature_user_agent' => $request->userAgent(),
            ]);

            // Send confirmation email to client with signed quote PDF
            try {
                $pdfService = new PdfGeneratorService();
                Mail::to($quote->client->email)->send(new QuoteAccepted($quote, $pdfService));
            } catch (\Exception $e) {
                \Log::error('Failed to send quote acceptance email: ' . $e->getMessage());
                // Don't fail the request if email fails
            }
        }

        return response()->json([
            'message' => 'Quote accepted successfully with electronic signature',
            'data' => $quote->load(['client', 'items'])
        ]);
    }

    /**
     * Reject quote
     */
    public function reject(Request $request, $id)
    {
        $quote = Quote::where('tenant_id', auth()->user()->tenant_id)
            ->findOrFail($id);

        if ($quote->status !== 'sent') {
            return response()->json([
                'message' => 'Quote must be sent to be rejected'
            ], 400);
        }

        $quote->update([
            'status' => 'rejected',
            'rejected_at' => now(),
            'rejection_reason' => $request->reason
        ]);

        return response()->json([
            'message' => 'Quote rejected',
            'data' => $quote->load(['client', 'items'])
        ]);
    }

    /**
     * Convert quote to invoice
     */
    public function convertToInvoice($id)
    {
        $quote = Quote::where('tenant_id', auth()->user()->tenant_id)
            ->with(['client', 'items'])
            ->findOrFail($id);

        if ($quote->status !== 'accepted') {
            return response()->json([
                'message' => 'Quote must be accepted to convert to invoice'
            ], 400);
        }

        DB::beginTransaction();
        try {
            // Generate invoice number
            $tenant = auth()->user()->tenant;
            $lastInvoice = \App\Models\Invoice::where('tenant_id', $tenant->id)
                ->orderBy('id', 'desc')
                ->first();

            $nextNumber = $lastInvoice ? (int)substr($lastInvoice->invoice_number, -4) + 1 : 1;
            $invoiceNumber = sprintf('INV-%04d', $nextNumber);

            // Create invoice from quote
            $invoice = \App\Models\Invoice::create([
                'tenant_id' => $quote->tenant_id,
                'client_id' => $quote->client_id,
                'invoice_number' => $invoiceNumber,
                'issue_date' => now(),
                'due_date' => now()->addDays(30),
                'status' => 'draft',
                'subtotal' => $quote->subtotal,
                'tax_amount' => $quote->tax_amount,
                'total_amount' => $quote->total_amount,
                'notes' => $quote->notes,
            ]);

            // Copy quote items to invoice
            foreach ($quote->items as $item) {
                $invoice->items()->create([
                    'description' => $item->description,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'tax_rate' => $item->tax_rate,
                    'total' => $item->total,
                ]);
            }

            // Update quote status
            $quote->update([
                'status' => 'converted',
                'invoice_id' => $invoice->id
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Quote converted to invoice successfully',
                'data' => [
                    'quote' => $quote,
                    'invoice' => $invoice->load(['client', 'items'])
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'message' => 'Failed to convert quote to invoice',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Download quote as PDF
     */
    public function downloadPdf($id, PdfGeneratorService $pdfService)
    {
        $quote = Quote::where('tenant_id', auth()->user()->tenant_id)
            ->findOrFail($id);

        return $pdfService->generateQuotePdf($quote, download: true);
    }

    /**
     * Cancel a quote
     */
    public function cancel(Request $request, $id)
    {
        $quote = Quote::where('tenant_id', auth()->user()->tenant_id)
            ->findOrFail($id);

        if (!$quote->canBeCancelled()) {
            return response()->json([
                'message' => 'This quote cannot be cancelled. Current status: ' . $quote->status
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'reason' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $quote->cancel($request->input('reason'));

            return response()->json([
                'message' => 'Quote cancelled successfully',
                'data' => $quote->load(['client', 'items'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to cancel quote',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
