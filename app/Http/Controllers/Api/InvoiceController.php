<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\TimeEntry;
use App\Models\Expense;
use App\Models\Payment;
use App\Services\PdfGeneratorService;
use App\Services\EmailService;
use App\Services\StripePaymentService;
use App\Services\CreditNoteService;
use App\Services\FacturXService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class InvoiceController extends Controller
{
    /**
     * Display a listing of invoices
     */
    public function index(Request $request)
    {
        $query = Invoice::with(['client', 'project', 'items'])
            ->where('tenant_id', auth()->user()->tenant_id);

        // Search
        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('client', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%");
                    });
            });
        }

        // Filter by client
        if ($request->client_id) {
            $query->where('client_id', $request->client_id);
        }

        // Filter by status
        if ($request->status) {
            $query->where('status', $request->status);
        }

        // Filter by date range
        if ($request->start_date) {
            $query->where('date', '>=', $request->start_date);
        }
        if ($request->end_date) {
            $query->where('date', '<=', $request->end_date);
        }

        // Sort
        $sortBy = $request->sort_by ?? 'date';
        $sortOrder = $request->sort_order ?? 'desc';
        $query->orderBy($sortBy, $sortOrder);

        return $query->paginate(20);
    }

    /**
     * Create invoice from time entries and expenses
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'project_id' => 'nullable|exists:projects,id',
            'date' => 'required|date',
            'due_date' => 'required|date|after_or_equal:date',
            'status' => 'required|in:draft,pending,sent,viewed,paid,overdue,cancelled',
            'type' => 'nullable|in:invoice,quote,credit_note,advance,final',
            'payment_terms' => 'nullable|integer|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'discount_type' => 'required_with:discount_amount|in:fixed,percentage',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string',
            'footer' => 'nullable|string',
            'conditions' => 'nullable|string',
            'time_entry_ids' => 'nullable|array',
            'time_entry_ids.*' => 'exists:time_entries,id',
            'expense_ids' => 'nullable|array',
            'expense_ids.*' => 'exists:expenses,id',
            'custom_items' => 'nullable|array',
            'custom_items.*.description' => 'required|string',
            'custom_items.*.quantity' => 'required|numeric|min:0',
            'custom_items.*.unit_price' => 'required|numeric|min:0',
            'custom_items.*.tax_rate' => 'nullable|numeric|min:0|max:100'
        ]);

        // === VALIDATION DE CONFORMITÉ AVANT CRÉATION ===
        $tenant = auth()->user()->tenant;
        $client = \App\Models\Client::findOrFail($validated['client_id']);

        $complianceService = app(\App\Services\InvoicingComplianceService::class);
        $validation = $complianceService->validateInvoiceCreation($tenant, $client);

        if (!$validation['can_create_invoice']) {
            $errorMessage = $complianceService->formatValidationMessage($validation);

            return response()->json([
                'message' => 'Paramètres de facturation incomplets',
                'error' => 'INVOICING_COMPLIANCE_ERROR',
                'validation' => $validation,
                'formatted_message' => $errorMessage,
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Get tenant and check VAT threshold
            $tenant->checkVatThreshold(); // Auto-check and apply VAT if threshold was exceeded

            // Get default tax rate (may have changed if threshold was exceeded)
            $defaultTaxRate = $tenant->fresh()->getDefaultTaxRate();
            
            // Calculate totals
            $subtotal = 0;
            $items = [];

            // Process time entries
            if (!empty($validated['time_entry_ids'])) {
                $timeEntries = TimeEntry::whereIn('id', $validated['time_entry_ids'])
                    ->where('is_billable', true)
                    ->whereNull('invoice_id')
                    ->get();

                // Group by task or project
                $groupedEntries = $timeEntries->groupBy('task_id');

                foreach ($groupedEntries as $taskId => $entries) {
                    $totalHours = $entries->sum('duration_seconds') / 3600;
                    $hourlyRate = $entries->first()->hourly_rate;
                    $amount = $totalHours * $hourlyRate;

                    $description = $taskId
                        ? $entries->first()->task->title
                        : $entries->first()->project->name;

                    $description .= ' - ' . round($totalHours, 2) . ' hours';

                    $items[] = [
                        'type' => 'time',
                        'description' => $description,
                        'quantity' => round($totalHours, 2),
                        'unit_price' => $hourlyRate,
                        'tax_rate' => $defaultTaxRate, // Use tenant's default tax rate
                        'total' => $amount,
                        'time_entry_ids' => $entries->pluck('id')->toArray()
                    ];

                    $subtotal += $amount;
                }
            }

            // Process expenses
            if (!empty($validated['expense_ids'])) {
                $expenses = Expense::whereIn('id', $validated['expense_ids'])
                    ->where('is_billable', true)
                    ->whereNull('invoice_id')
                    ->get();

                foreach ($expenses as $expense) {
                    $items[] = [
                        'type' => 'expense',
                        'description' => $expense->description,
                        'quantity' => 1,
                        'unit_price' => $expense->amount,
                        'tax_rate' => $defaultTaxRate, // Use tenant's default tax rate
                        'total' => $expense->amount
                    ];

                    $subtotal += $expense->amount;
                }
            }

            // Process custom items
            if (!empty($validated['custom_items'])) {
                foreach ($validated['custom_items'] as $customItem) {
                    $total = $customItem['quantity'] * $customItem['unit_price'];

                    $items[] = [
                        'type' => 'custom',
                        'description' => $customItem['description'],
                        'quantity' => $customItem['quantity'],
                        'unit_price' => $customItem['unit_price'],
                        'tax_rate' => $customItem['tax_rate'] ?? $defaultTaxRate, // Use tenant's default
                        'total' => $total
                    ];

                    $subtotal += $total;
                }
            }

            // Calculate discount
            $discountAmount = 0;
            if (isset($validated['discount_amount'])) {
                if ($validated['discount_type'] === 'percentage') {
                    $discountAmount = $subtotal * ($validated['discount_amount'] / 100);
                } else {
                    $discountAmount = $validated['discount_amount'];
                }
            }

            // Calculate tax
            $taxableAmount = $subtotal - $discountAmount;
            $taxAmount = $taxableAmount * (($validated['tax_rate'] ?? 0) / 100);

            // Calculate total
            $total = $taxableAmount + $taxAmount;

            // Get tenant's default conditions if not provided
            $tenant = auth()->user()->tenant;
            $type = $validated['type'] ?? 'invoice';
            $conditions = $validated['conditions'] ?? null;
            
            // Auto-fill conditions from tenant settings if not provided
            if (empty($conditions)) {
                if ($type === 'quote') {
                    $conditions = $tenant->default_quote_conditions;
                } else {
                    $conditions = $tenant->default_invoice_conditions;
                }
            }

            // Create invoice
            $invoice = Invoice::create([
                'tenant_id' => auth()->user()->tenant_id,
                'created_by' => auth()->id(),
                'client_id' => $validated['client_id'],
                'project_id' => $validated['project_id'],
                'type' => $type,
                'date' => $validated['date'],
                'due_date' => $validated['due_date'],
                'status' => $validated['status'],
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'tax_rate' => $validated['tax_rate'] ?? 0,
                'discount_amount' => $discountAmount,
                'discount_type' => $validated['discount_type'] ?? 'fixed',
                'total' => $total,
                'currency' => 'EUR',
                'payment_terms' => $validated['payment_terms'] ?? 30,
                'notes' => $validated['notes'],
                'footer' => $validated['footer'],
                'conditions' => $conditions
            ]);

            // Create invoice items
            foreach ($items as $index => $item) {
                $subtotal = $item['quantity'] * $item['unit_price'];
                $taxRate = $item['tax_rate'] ?? $defaultTaxRate;
                $taxAmount = $subtotal * ($taxRate / 100);
                
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'type' => $item['type'] ?? 'custom',
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'tax_rate' => $taxRate,
                    'subtotal' => $subtotal,
                    'tax_amount' => $taxAmount,
                    'total' => $subtotal + $taxAmount,
                    'position' => $index + 1
                ]);
            }

            // Update time entries and expenses
            if (!empty($validated['time_entry_ids'])) {
                TimeEntry::whereIn('id', $validated['time_entry_ids'])
                    ->update(['invoice_id' => $invoice->id, 'is_locked' => true]);
            }

            if (!empty($validated['expense_ids'])) {
                Expense::whereIn('id', $validated['expense_ids'])
                    ->update(['invoice_id' => $invoice->id]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Invoice created successfully',
                'invoice' => $invoice->load(['client', 'items'])
            ], 201);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'message' => 'Failed to create invoice',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified invoice
     */
    public function show($id)
    {
        // Load only safe relations to avoid infinite recursion
        $invoice = Invoice::with([
            'client', 
            'project', 
            'items', 
            'payments', 
            'auditLogs'
        ])
        ->where('tenant_id', auth()->user()->tenant_id)
        ->find($id);

        if (!$invoice) {
            return response()->json([
                'message' => 'Invoice not found'
            ], 404);
        }

        // Load type-specific relations
        if ($invoice->type === 'final') {
            // Pour une facture de solde: charger les acomptes liés
            $invoice->load(['advances' => function ($query) {
                $query->select('invoices.id', 'invoices.invoice_number', 'invoices.date', 'invoices.total', 'invoices.advance_percentage', 'invoices.status')
                      ->with('client:id,name');
            }]);
            $invoice->total_advances = $invoice->total_advances;
            $invoice->remaining_balance = $invoice->remaining_balance;
        }

        if ($invoice->type === 'advance') {
            // Pour un acompte: charger la facture de solde liée (si existe)
            $invoice->load(['finalInvoice' => function ($query) {
                $query->select('invoices.id', 'invoices.invoice_number', 'invoices.date', 'invoices.total', 'invoices.status')
                      ->with('client:id,name');
            }]);
            $invoice->is_linked_to_final = $invoice->isLinkedToFinalInvoice();
        }

        return response()->json([
            'data' => $invoice
        ]);
    }

    /**
     * Update the specified invoice
     */
    public function update(Request $request, Invoice $invoice)
    {
        // Check if invoice can be edited
        if (!$invoice->canBeEdited()) {
            return response()->json([
                'message' => 'Invoice cannot be edited once sent or locked'
            ], 422);
        }

        $validated = $request->validate([
            'date' => 'date',
            'due_date' => 'date|after_or_equal:date',
            'payment_terms' => 'nullable|integer|min:0',
            'notes' => 'nullable|string',
            'footer' => 'nullable|string'
        ]);

        $invoice->update($validated);

        return response()->json([
            'message' => 'Invoice updated successfully',
            'invoice' => $invoice->fresh()->load(['client', 'items'])
        ]);
    }

    /**
  +++++++ REPLACE
     * Send invoice to client
     */
    public function send(Request $request, Invoice $invoice, EmailService $emailService, StripePaymentService $stripeService)
    {
        if ($invoice->status === 'paid' || $invoice->status === 'cancelled') {
            return response()->json([
                'message' => 'Cannot send paid or cancelled invoice'
            ], 422);
        }

        $validated = $request->validate([
            'recipient_email' => 'nullable|email'
        ]);

        // Generate Stripe payment link if Stripe is configured and enabled for tenant
        $tenant = auth()->user()->tenant;
        if ($tenant && $tenant->isStripeActive()) {
            try {
                // Configure Stripe service with tenant
                $stripeService->setTenant($tenant);

                // Create checkout session for the invoice
                $successUrl = config('app.url') . '/invoices/' . $invoice->id . '/payment/success';
                $cancelUrl = config('app.url') . '/invoices/' . $invoice->id . '/payment/cancel';

                $session = $stripeService->createCheckoutSession(
                    $invoice->load(['items', 'client']),
                    $successUrl,
                    $cancelUrl
                );

                // Update invoice with payment link and session ID
                $invoice->update([
                    'stripe_payment_link' => $session->url,
                    'stripe_checkout_session_id' => $session->id,
                ]);

                Log::info('Stripe payment link generated for invoice', [
                    'invoice_id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'session_id' => $session->id,
                ]);

            } catch (\Exception $e) {
                // Log error but don't fail the send operation
                Log::error('Failed to generate Stripe payment link', [
                    'invoice_id' => $invoice->id,
                    'error' => $e->getMessage(),
                ]);
                // Continue with sending the invoice even if Stripe link generation fails
            }
        }

        // Send email
        $sent = $emailService->sendInvoice($invoice, $validated['recipient_email'] ?? null);

        if (!$sent) {
            return response()->json([
                'message' => 'Failed to send invoice. Please check the client email address.',
                'error' => 'Email sending failed'
            ], 422);
        }

        // Update status
        $invoice->markAsSent();

        return response()->json([
            'message' => 'Invoice sent successfully',
            'invoice' => $invoice->fresh()
        ]);
    }

    /**
     * Validate invoice (change from draft to sent without sending email)
     */
    public function validate(Invoice $invoice)
    {
        if ($invoice->status !== 'draft') {
            return response()->json([
                'message' => 'Only draft invoices can be validated',
                'current_status' => $invoice->status
            ], 422);
        }

        // Mark as sent without sending email
        $invoice->markAsSent();

        return response()->json([
            'message' => 'Invoice validated successfully',
            'invoice' => $invoice->fresh()->load(['client', 'items'])
        ]);
    }

    /**
     * Mark invoice as paid
     */
    public function markAsPaid(Request $request, Invoice $invoice, EmailService $emailService)
    {
        if ($invoice->status === 'paid') {
            return response()->json([
                'message' => 'Invoice is already paid'
            ], 422);
        }

        $validated = $request->validate([
            'payment_method' => 'nullable|string|max:50',
            'payment_reference' => 'nullable|string|max:100',
            'paid_amount' => 'nullable|numeric|min:0',
            'send_confirmation' => 'nullable|boolean'
        ]);

        DB::beginTransaction();
        try {
            $paidAmount = $validated['paid_amount'] ?? $invoice->total;
            $paymentMethod = $validated['payment_method'] ?? 'bank_transfer';

            // Create payment record
            Payment::create([
                'invoice_id' => $invoice->id,
                'amount' => $paidAmount,
                'payment_date' => now(),
                'payment_method' => $paymentMethod,
                'reference' => $validated['payment_reference'] ?? null,
                'status' => 'succeeded'
            ]);

            // Mark invoice as paid
            $invoice->markAsPaid();

            // Send payment confirmation email if requested
            if ($validated['send_confirmation'] ?? true) {
                $emailService->queuePaymentReceived($invoice, $paidAmount, $paymentMethod);
            }

            DB::commit();

            return response()->json([
                'message' => 'Invoice marked as paid',
                'invoice' => $invoice->fresh()
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'message' => 'Failed to mark invoice as paid',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Send invoice reminder
     */
    public function sendReminder(Request $request, Invoice $invoice, EmailService $emailService)
    {
        if ($invoice->status === 'paid') {
            return response()->json([
                'message' => 'Cannot send reminder for paid invoice'
            ], 422);
        }

        $validated = $request->validate([
            'recipient_email' => 'nullable|email'
        ]);

        $sent = $emailService->sendInvoiceReminder($invoice, $validated['recipient_email'] ?? null);

        if (!$sent) {
            return response()->json([
                'message' => 'Failed to send reminder. Please check the client email address.',
                'error' => 'Email sending failed'
            ], 422);
        }

        return response()->json([
            'message' => 'Reminder sent successfully'
        ]);
    }

    /**
     * Download invoice PDF
     */
    public function downloadPdf(Invoice $invoice, PdfGeneratorService $pdfService)
    {
        return $pdfService->generateInvoicePdf($invoice, download: true);
    }

    /**
     * Get audit log for NF525 compliance
     */
    /**
     * Send invoice to Chorus Pro (French government invoicing platform)
     */
    public function sendToChorus(Invoice $invoice)
    {
        // Check if invoice is finalized
        if ($invoice->status === 'draft') {
            return response()->json([
                'message' => 'Cannot send draft invoice to Chorus Pro'
            ], 422);
        }

        // Check if client is a French public entity
        $client = $invoice->client;
        if (!$client->is_public_entity || $client->country !== 'FR') {
            return response()->json([
                'message' => 'Client must be a French public entity to use Chorus Pro'
            ], 422);
        }

        // TODO: Implement Chorus Pro integration
        // This would typically involve:
        // 1. Convert invoice to Chorus Pro format (XML/UBL)
        // 2. Submit to Chorus Pro API
        // 3. Store Chorus Pro reference number
        // 4. Update invoice status

        return response()->json([
            'message' => 'Chorus Pro integration not yet implemented',
            'invoice_id' => $invoice->id,
            'status' => 'pending'
        ], 501); // 501 Not Implemented
    }

    public function auditLog(Invoice $invoice)
    {
        return $invoice->auditLogs()->with('user')->get();
    }

    /**
     * Create credit note from invoice
     */
    public function createCreditNote(
        Request $request, 
        Invoice $invoice, 
        CreditNoteService $creditNoteService
    ) {
        $validated = $request->validate([
            'reason' => 'required|string|max:500',
            'full_credit' => 'boolean',
            'items' => 'array',
            'items.*.id' => 'exists:invoice_items,id',
            'items.*.quantity' => 'numeric|min:0'
        ]);
        
        try {
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
     * Cancel invoice completely with credit note
     */
    public function cancelInvoice(
        Request $request, 
        Invoice $invoice, 
        CreditNoteService $creditNoteService
    ) {
        $validated = $request->validate([
            'reason' => 'required|string|max:500'
        ]);
        
        try {
            $creditNote = $creditNoteService->cancelInvoice(
                $invoice, 
                $validated['reason']
            );
            
            return response()->json([
                'message' => 'Facture annulée avec succès',
                'invoice' => $invoice->fresh(['creditNotes']),
                'credit_note' => $creditNote
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Échec de l\'annulation',
                'error' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Get all credit notes for an invoice
     */
    public function getCreditNotes(Invoice $invoice)
    {
        $creditNotes = $invoice->creditNotes()
            ->with(['items'])
            ->orderBy('credit_note_date', 'desc')
            ->get();
        
        return response()->json([
            'data' => $creditNotes,
            'total_credited' => $invoice->total_credited,
            'remaining_balance' => $invoice->total - $invoice->total_credited
        ]);
    }

    /**
     * Download invoice as FacturX (PDF + embedded XML)
     */
    public function downloadFacturX(Invoice $invoice, FacturXService $facturXService)
    {
        try {
            // Generate if doesn't exist
            if (!$invoice->facturx_path) {
                $path = $facturXService->generateFacturX($invoice);
                if ($path) {
                    $invoice->update([
                        'facturx_path' => $path,
                        'facturx_generated_at' => now(),
                        'electronic_format' => 'facturx'
                    ]);
                }
            }

            if (!$invoice->facturx_path || !Storage::exists($invoice->facturx_path)) {
                return response()->json([
                    'message' => 'Fichier FacturX introuvable ou impossible à générer',
                    'error' => 'FACTURX_NOT_FOUND'
                ], 404);
            }

            return Storage::download($invoice->facturx_path);

        } catch (\App\Exceptions\FacturXValidationException $e) {
            // Gestion spécifique des erreurs de validation FacturX
            Log::warning('FacturX download failed - validation error', [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'missing_fields' => $e->getMissingFields(),
            ]);

            return response()->json($e->toApiResponse(), 422);

        } catch (\Exception $e) {
            // Autres erreurs
            Log::error('FacturX download failed - unexpected error', [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Erreur lors du téléchargement FacturX',
                'error' => 'FACTURX_DOWNLOAD_ERROR',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate FacturX for invoice
     */
    public function generateFacturX(Invoice $invoice, FacturXService $facturXService)
    {
        try {
            // Force regeneration
            $path = $facturXService->generateFacturX($invoice);

            if (!$path) {
                return response()->json([
                    'message' => 'Échec de génération FacturX',
                    'error' => 'FACTURX_GENERATION_FAILED',
                    'details' => 'Le service a retourné une valeur nulle. Vérifiez les logs pour plus de détails.'
                ], 500);
            }

            $invoice->update([
                'facturx_path' => $path,
                'facturx_generated_at' => now(),
                'electronic_format' => 'facturx'
            ]);

            return response()->json([
                'message' => 'FacturX généré avec succès',
                'path' => $path,
                'invoice' => $invoice->fresh()
            ]);

        } catch (\App\Exceptions\FacturXValidationException $e) {
            // Gestion spécifique des erreurs de validation FacturX
            Log::warning('FacturX generation failed - validation error', [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'missing_fields' => $e->getMissingFields(),
            ]);

            return response()->json($e->toApiResponse(), 422);

        } catch (\Exception $e) {
            // Autres erreurs
            Log::error('FacturX generation failed - unexpected error', [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Échec de génération FacturX',
                'error' => 'FACTURX_GENERATION_ERROR',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete invoice (soft delete)
     */
    public function destroy(Invoice $invoice)
    {
        // Check if invoice can be deleted - ONLY draft invoices allowed (fiscal compliance)
        if ($invoice->status !== 'draft') {
            return response()->json([
                'message' => 'Seules les factures en brouillon peuvent être supprimées (conformité fiscale - numérotation séquentielle)',
                'error' => 'INVOICE_NOT_DRAFT'
            ], 422);
        }

        // Additional check for locked invoices
        if ($invoice->is_locked) {
            return response()->json([
                'message' => 'Cette facture est verrouillée et ne peut pas être supprimée',
                'error' => 'INVOICE_LOCKED'
            ], 422);
        }

        // Release time entries and expenses
        TimeEntry::where('invoice_id', $invoice->id)
            ->update(['invoice_id' => null, 'is_locked' => false]);

        Expense::where('invoice_id', $invoice->id)
            ->update(['invoice_id' => null]);

        $invoice->delete();

        return response()->json([
            'message' => 'Invoice deleted successfully'
        ]);
    }
}
