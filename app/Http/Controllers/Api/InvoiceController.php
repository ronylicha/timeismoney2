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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
            'payment_terms' => 'nullable|integer|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'discount_type' => 'required_with:discount_amount|in:fixed,percentage',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string',
            'footer' => 'nullable|string',
            'time_entry_ids' => 'nullable|array',
            'time_entry_ids.*' => 'exists:time_entries,id',
            'expense_ids' => 'nullable|array',
            'expense_ids.*' => 'exists:expenses,id',
            'custom_items' => 'nullable|array',
            'custom_items.*.description' => 'required|string',
            'custom_items.*.quantity' => 'required|numeric|min:0',
            'custom_items.*.unit_price' => 'required|numeric|min:0'
        ]);

        DB::beginTransaction();
        try {
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

            // Create invoice
            $invoice = Invoice::create([
                'tenant_id' => auth()->user()->tenant_id,
                'client_id' => $validated['client_id'],
                'project_id' => $validated['project_id'],
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
                'footer' => $validated['footer']
            ]);

            // Create invoice items
            foreach ($items as $index => $item) {
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'type' => $item['type'],
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'tax_rate' => $validated['tax_rate'] ?? 0,
                    'tax_amount' => $item['total'] * (($validated['tax_rate'] ?? 0) / 100),
                    'total' => $item['total'],
                    'time_entry_ids' => $item['time_entry_ids'] ?? null,
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
    public function show(Invoice $invoice)
    {
        return $invoice->load(['client', 'project', 'items', 'payments', 'auditLogs']);
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

        // Generate Stripe payment link if Stripe is configured for tenant
        $tenant = auth()->user()->tenant;
        if ($tenant && $tenant->hasStripeConfigured()) {
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
                'client_id' => $invoice->client_id,
                'amount' => $paidAmount,
                'payment_date' => now(),
                'payment_method' => $paymentMethod,
                'reference' => $validated['payment_reference'],
                'status' => 'completed'
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
    public function auditLog(Invoice $invoice)
    {
        return $invoice->auditLogs()->with('user')->get();
    }

    /**
     * Delete invoice (soft delete)
     */
    public function destroy(Invoice $invoice)
    {
        // Check if invoice can be deleted
        if ($invoice->is_locked || in_array($invoice->status, ['sent', 'paid'])) {
            return response()->json([
                'message' => 'Cannot delete sent or paid invoice (NF525 compliance)'
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