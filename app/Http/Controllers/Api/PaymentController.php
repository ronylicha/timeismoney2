<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Services\StripePaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class PaymentController extends Controller
{
    protected $stripeService;

    public function __construct(StripePaymentService $stripeService)
    {
        $this->stripeService = $stripeService;

        // Configure Stripe service with current tenant after authentication
        $this->middleware(function ($request, $next) {
            if (auth()->check() && auth()->user()->tenant) {
                $this->stripeService->setTenant(auth()->user()->tenant);
            }
            return $next($request);
        });
    }

    /**
     * Get all payments for the current tenant
     */
    public function index(Request $request)
    {
        $query = Payment::with(['invoice', 'user'])
            ->where('tenant_id', auth()->user()->tenant_id);

        // Filter by invoice
        if ($request->has('invoice_id')) {
            $query->where('invoice_id', $request->invoice_id);
        }

        // Filter by status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filter by payment type
        if ($request->has('payment_type')) {
            $query->where('payment_type', $request->payment_type);
        }

        // Date range filter
        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $payments = $query->paginate($request->get('per_page', 15));

        return response()->json($payments);
    }

    /**
     * Show a specific payment
     */
    public function show($id)
    {
        $payment = Payment::with(['invoice', 'user', 'tenant'])
            ->where('tenant_id', auth()->user()->tenant_id)
            ->findOrFail($id);

        return response()->json(['data' => $payment]);
    }

    /**
     * Create a Stripe checkout session for an invoice
     */
    public function createCheckoutSession(Request $request, $invoiceId)
    {
        $validator = Validator::make($request->all(), [
            'success_url' => 'nullable|url',
            'cancel_url' => 'nullable|url',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $invoice = Invoice::where('tenant_id', auth()->user()->tenant_id)
                ->with(['items', 'client'])
                ->findOrFail($invoiceId);

            // Check if invoice can be paid
            if (!in_array($invoice->status, ['sent', 'viewed', 'overdue'])) {
                return response()->json([
                    'message' => 'Invoice cannot be paid in current status'
                ], 400);
            }

            $session = $this->stripeService->createCheckoutSession(
                $invoice,
                $request->success_url,
                $request->cancel_url
            );

            return response()->json([
                'message' => 'Checkout session created successfully',
                'data' => [
                    'session_id' => $session->id,
                    'session_url' => $session->url,
                    'publishable_key' => config('stripe.key'),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to create checkout session', [
                'invoice_id' => $invoiceId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to create checkout session',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a payment intent for direct card payments
     */
    public function createPaymentIntent(Request $request, $invoiceId)
    {
        try {
            $invoice = Invoice::where('tenant_id', auth()->user()->tenant_id)
                ->with(['items', 'client'])
                ->findOrFail($invoiceId);

            // Check if invoice can be paid
            if (!in_array($invoice->status, ['sent', 'viewed', 'overdue'])) {
                return response()->json([
                    'message' => 'Invoice cannot be paid in current status'
                ], 400);
            }

            $paymentIntent = $this->stripeService->createPaymentIntent($invoice);

            return response()->json([
                'message' => 'Payment intent created successfully',
                'data' => [
                    'client_secret' => $paymentIntent->client_secret,
                    'payment_intent_id' => $paymentIntent->id,
                    'publishable_key' => config('stripe.key'),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to create payment intent', [
                'invoice_id' => $invoiceId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to create payment intent',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Confirm a payment intent
     */
    public function confirmPayment(Request $request, $paymentIntentId)
    {
        $validator = Validator::make($request->all(), [
            'payment_method' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $paymentIntent = $this->stripeService->confirmPaymentIntent(
                $paymentIntentId,
                $request->only(['payment_method'])
            );

            return response()->json([
                'message' => 'Payment confirmed',
                'data' => [
                    'status' => $paymentIntent->status,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to confirm payment intent', [
                'payment_intent_id' => $paymentIntentId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to confirm payment',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get payment intent status
     */
    public function getPaymentStatus($paymentIntentId)
    {
        try {
            $paymentIntent = $this->stripeService->retrievePaymentIntent($paymentIntentId);

            $payment = Payment::where('stripe_payment_intent_id', $paymentIntentId)
                ->where('tenant_id', auth()->user()->tenant_id)
                ->first();

            return response()->json([
                'data' => [
                    'status' => $paymentIntent->status,
                    'amount' => $paymentIntent->amount / 100,
                    'currency' => strtoupper($paymentIntent->currency),
                    'payment' => $payment,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to retrieve payment status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancel a payment
     */
    public function cancelPayment($paymentIntentId)
    {
        try {
            $payment = Payment::where('stripe_payment_intent_id', $paymentIntentId)
                ->where('tenant_id', auth()->user()->tenant_id)
                ->firstOrFail();

            if (!$payment->isPending()) {
                return response()->json([
                    'message' => 'Only pending payments can be cancelled'
                ], 400);
            }

            $this->stripeService->cancelPaymentIntent($paymentIntentId);

            return response()->json([
                'message' => 'Payment cancelled successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to cancel payment',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Refund a payment
     */
    public function refundPayment(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'amount' => 'nullable|numeric|min:0.01',
            'reason' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $payment = Payment::where('tenant_id', auth()->user()->tenant_id)
                ->findOrFail($id);

            if (!$payment->isSuccessful()) {
                return response()->json([
                    'message' => 'Only successful payments can be refunded'
                ], 400);
            }

            if ($payment->isRefunded()) {
                return response()->json([
                    'message' => 'Payment has already been refunded'
                ], 400);
            }

            $refund = $this->stripeService->refundPayment(
                $payment,
                $request->amount,
                $request->reason
            );

            return response()->json([
                'message' => 'Payment refunded successfully',
                'data' => [
                    'refund_id' => $refund->id,
                    'amount' => $refund->amount / 100,
                    'status' => $refund->status,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to refund payment', [
                'payment_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to refund payment',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Stripe publishable key for the current tenant
     */
    public function getPublishableKey()
    {
        $tenant = auth()->user()->tenant;

        if (!$tenant->hasStripeConfigured()) {
            return response()->json([
                'message' => 'Stripe is not configured for this tenant',
                'stripe_configured' => false
            ], 400);
        }

        return response()->json([
            'publishable_key' => $this->stripeService->getPublishableKey(),
            'stripe_configured' => true,
            'webhook_url' => route('stripe.webhook'), // URL for Stripe webhook configuration
        ]);
    }
}
