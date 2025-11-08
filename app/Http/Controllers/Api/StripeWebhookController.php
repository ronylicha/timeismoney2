<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\StripePaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Stripe\Webhook;
use Stripe\Exception\SignatureVerificationException;

class StripeWebhookController extends Controller
{
    protected $stripeService;

    public function __construct(StripePaymentService $stripeService)
    {
        $this->stripeService = $stripeService;
    }

    /**
     * Handle Stripe webhook events
     * Note: This webhook handles events for all tenants
     */
    public function handleWebhook(Request $request)
    {
        $payload = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature');

        // First, decode the payload to extract tenant_id from metadata
        $payloadData = json_decode($payload, true);

        // Extract tenant_id from event metadata
        $tenantId = null;
        if (isset($payloadData['data']['object']['metadata']['tenant_id'])) {
            $tenantId = $payloadData['data']['object']['metadata']['tenant_id'];
        }

        // Get the tenant to retrieve webhook secret
        $tenant = null;
        if ($tenantId) {
            $tenant = \App\Models\Tenant::find($tenantId);
        }

        // Use tenant-specific webhook secret if available, fallback to global config
        $webhookSecret = $tenant?->getStripeWebhookSecret() ?? config('stripe.webhook_secret');

        if (!$webhookSecret) {
            Log::error('Stripe webhook secret not configured', [
                'tenant_id' => $tenantId,
            ]);
            return response()->json(['error' => 'Webhook secret not configured'], 500);
        }

        try {
            $event = Webhook::constructEvent(
                $payload,
                $sigHeader,
                $webhookSecret
            );
        } catch (\UnexpectedValueException $e) {
            // Invalid payload
            Log::error('Invalid webhook payload', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Invalid payload'], 400);
        } catch (SignatureVerificationException $e) {
            // Invalid signature
            Log::error('Invalid webhook signature', [
                'error' => $e->getMessage(),
                'tenant_id' => $tenantId,
            ]);
            return response()->json(['error' => 'Invalid signature'], 400);
        }

        // Configure the service with the tenant if available
        if ($tenant) {
            $this->stripeService->setTenant($tenant);
        }

        // Log the webhook event
        Log::info('Stripe webhook received', [
            'type' => $event->type,
            'id' => $event->id,
            'tenant_id' => $tenantId,
        ]);

        // Handle the event
        try {
            switch ($event->type) {
                case 'payment_intent.succeeded':
                    $this->handlePaymentIntentSucceeded($event->data->object);
                    break;

                case 'payment_intent.payment_failed':
                    $this->handlePaymentIntentFailed($event->data->object);
                    break;

                case 'payment_intent.canceled':
                    $this->handlePaymentIntentCanceled($event->data->object);
                    break;

                case 'charge.refunded':
                    $this->handleChargeRefunded($event->data->object);
                    break;

                case 'checkout.session.completed':
                    $this->handleCheckoutSessionCompleted($event->data->object);
                    break;

                case 'checkout.session.expired':
                    $this->handleCheckoutSessionExpired($event->data->object);
                    break;

                default:
                    Log::info('Unhandled webhook event type', ['type' => $event->type]);
            }

            return response()->json(['status' => 'success']);

        } catch (\Exception $e) {
            Log::error('Error handling webhook', [
                'type' => $event->type,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json(['error' => 'Webhook handler failed'], 500);
        }
    }

    /**
     * Handle payment intent succeeded event
     */
    protected function handlePaymentIntentSucceeded($paymentIntent)
    {
        Log::info('Processing payment_intent.succeeded', [
            'payment_intent_id' => $paymentIntent->id,
        ]);

        try {
            $payment = $this->stripeService->handleSuccessfulPayment($paymentIntent);

            if ($payment) {
                Log::info('Payment marked as succeeded', [
                    'payment_id' => $payment->id,
                    'invoice_id' => $payment->invoice_id,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Error handling payment_intent.succeeded', [
                'payment_intent_id' => $paymentIntent->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Handle payment intent failed event
     */
    protected function handlePaymentIntentFailed($paymentIntent)
    {
        Log::info('Processing payment_intent.payment_failed', [
            'payment_intent_id' => $paymentIntent->id,
        ]);

        try {
            $payment = $this->stripeService->handleFailedPayment($paymentIntent);

            if ($payment) {
                Log::info('Payment marked as failed', [
                    'payment_id' => $payment->id,
                    'failure_message' => $payment->failure_message,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Error handling payment_intent.payment_failed', [
                'payment_intent_id' => $paymentIntent->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Handle payment intent canceled event
     */
    protected function handlePaymentIntentCanceled($paymentIntent)
    {
        Log::info('Processing payment_intent.canceled', [
            'payment_intent_id' => $paymentIntent->id,
        ]);

        try {
            $payment = \App\Models\Payment::where('stripe_payment_intent_id', $paymentIntent->id)->first();

            if ($payment) {
                $payment->update(['status' => 'cancelled']);

                Log::info('Payment marked as cancelled', [
                    'payment_id' => $payment->id,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Error handling payment_intent.canceled', [
                'payment_intent_id' => $paymentIntent->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Handle charge refunded event
     */
    protected function handleChargeRefunded($charge)
    {
        Log::info('Processing charge.refunded', [
            'charge_id' => $charge->id,
        ]);

        try {
            $payment = \App\Models\Payment::where('stripe_charge_id', $charge->id)->first();

            if ($payment) {
                $refundedAmount = $charge->amount_refunded / 100; // Convert from cents

                $payment->update([
                    'status' => 'refunded',
                    'refunded_amount' => $refundedAmount,
                    'refunded_at' => now(),
                ]);

                Log::info('Payment marked as refunded', [
                    'payment_id' => $payment->id,
                    'refunded_amount' => $refundedAmount,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Error handling charge.refunded', [
                'charge_id' => $charge->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Handle checkout session completed event
     */
    protected function handleCheckoutSessionCompleted($session)
    {
        Log::info('Processing checkout.session.completed', [
            'session_id' => $session->id,
        ]);

        try {
            // The payment_intent.succeeded event will handle the actual payment update
            // This event is primarily for tracking checkout completion
            $payment = \App\Models\Payment::where('metadata->checkout_session_id', $session->id)->first();

            if ($payment) {
                $payment->update([
                    'metadata' => array_merge($payment->metadata ?? [], [
                        'checkout_session_completed' => true,
                        'checkout_completed_at' => now()->toIso8601String(),
                    ]),
                ]);

                Log::info('Checkout session marked as completed', [
                    'payment_id' => $payment->id,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Error handling checkout.session.completed', [
                'session_id' => $session->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Handle checkout session expired event
     */
    protected function handleCheckoutSessionExpired($session)
    {
        Log::info('Processing checkout.session.expired', [
            'session_id' => $session->id,
        ]);

        try {
            $payment = \App\Models\Payment::where('metadata->checkout_session_id', $session->id)->first();

            if ($payment && $payment->isPending()) {
                $payment->update([
                    'status' => 'cancelled',
                    'failure_message' => 'Checkout session expired',
                ]);

                Log::info('Payment cancelled due to expired checkout session', [
                    'payment_id' => $payment->id,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Error handling checkout.session.expired', [
                'session_id' => $session->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
