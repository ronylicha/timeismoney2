<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Tenant;
use Stripe\Stripe;
use Stripe\PaymentIntent;
use Stripe\Customer;
use Stripe\Refund;
use Stripe\Checkout\Session as CheckoutSession;
use Illuminate\Support\Facades\Log;
use Exception;

class StripePaymentService
{
    protected $tenant;

    public function __construct(?Tenant $tenant = null)
    {
        // Use tenant-specific keys if tenant is provided and has Stripe configured
        if ($tenant && $tenant->hasStripeConfigured()) {
            $this->tenant = $tenant;
            Stripe::setApiKey($tenant->getStripeSecretKey());
        } else {
            // Fallback to global config (for backward compatibility or default)
            Stripe::setApiKey(config('stripe.secret'));
        }

        if (config('stripe.api_version')) {
            Stripe::setApiVersion(config('stripe.api_version'));
        }
    }

    /**
     * Set the tenant for this service instance
     */
    public function setTenant(Tenant $tenant): self
    {
        if ($tenant->hasStripeConfigured()) {
            $this->tenant = $tenant;
            Stripe::setApiKey($tenant->getStripeSecretKey());
        }

        return $this;
    }

    /**
     * Get the configured publishable key for the tenant
     */
    public function getPublishableKey(): ?string
    {
        if ($this->tenant) {
            return $this->tenant->getStripePublishableKey();
        }

        return config('stripe.key');
    }

    /**
     * Check if Stripe is configured
     */
    public function isConfigured(): bool
    {
        if ($this->tenant) {
            return $this->tenant->hasStripeConfigured();
        }

        return !empty(config('stripe.secret'));
    }

    /**
     * Create a Stripe checkout session for an invoice
     */
    public function createCheckoutSession(Invoice $invoice, ?string $successUrl = null, ?string $cancelUrl = null): CheckoutSession
    {
        if (!$this->isConfigured()) {
            throw new Exception('Stripe is not configured for this tenant');
        }
        try {
            $tenant = $invoice->tenant;
            $client = $invoice->client;

            // Get or create Stripe customer
            $customer = $this->getOrCreateCustomer($tenant, $client);

            // Create line items for the invoice
            $lineItems = [];
            foreach ($invoice->items as $item) {
                $lineItems[] = [
                    'price_data' => [
                        'currency' => strtolower($invoice->currency ?? 'eur'),
                        'product_data' => [
                            'name' => $item->description,
                            'description' => $item->details,
                        ],
                        'unit_amount' => (int) ($item->unit_price * 100), // Convert to cents
                    ],
                    'quantity' => (int) $item->quantity,
                ];
            }

            // Create checkout session
            $sessionData = [
                'customer' => $customer->id,
                'payment_method_types' => config('stripe.payment_methods', ['card', 'sepa_debit']),
                'line_items' => $lineItems,
                'mode' => 'payment',
                'success_url' => $successUrl ?? config('app.url') . '/invoices/' . $invoice->id . '/payment/success',
                'cancel_url' => $cancelUrl ?? config('app.url') . '/invoices/' . $invoice->id . '/payment/cancel',
                'metadata' => [
                    'invoice_id' => $invoice->id,
                    'tenant_id' => $tenant->id,
                    'invoice_number' => $invoice->invoice_number,
                ],
                'payment_intent_data' => [
                    'metadata' => [
                        'invoice_id' => $invoice->id,
                        'tenant_id' => $tenant->id,
                    ],
                ],
            ];

            $session = CheckoutSession::create($sessionData);

            // Create pending payment record
            Payment::create([
                'tenant_id' => $tenant->id,
                'invoice_id' => $invoice->id,
                'user_id' => auth()->id(),
                'stripe_payment_intent_id' => $session->payment_intent,
                'stripe_customer_id' => $customer->id,
                'amount' => $invoice->total,
                'currency' => $invoice->currency ?? 'EUR',
                'status' => 'pending',
                'payment_type' => 'invoice',
                'payment_method' => 'stripe_card',
                'metadata' => [
                    'checkout_session_id' => $session->id,
                ],
            ]);

            return $session;

        } catch (Exception $e) {
            Log::error('Stripe checkout session creation failed', [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Create a payment intent for direct card payments
     */
    public function createPaymentIntent(Invoice $invoice, array $options = []): PaymentIntent
    {
        try {
            $tenant = $invoice->tenant;
            $client = $invoice->client;

            $customer = $this->getOrCreateCustomer($tenant, $client);

            $paymentIntentData = [
                'amount' => (int) ($invoice->total * 100), // Convert to cents
                'currency' => strtolower($invoice->currency ?? 'eur'),
                'customer' => $customer->id,
                'description' => "Payment for invoice {$invoice->invoice_number}",
                'metadata' => [
                    'invoice_id' => $invoice->id,
                    'tenant_id' => $tenant->id,
                    'invoice_number' => $invoice->invoice_number,
                ],
            ];

            if (isset($options['payment_method'])) {
                $paymentIntentData['payment_method'] = $options['payment_method'];
            }

            if (isset($options['automatic_payment_methods'])) {
                $paymentIntentData['automatic_payment_methods'] = $options['automatic_payment_methods'];
            } else {
                $paymentIntentData['automatic_payment_methods'] = ['enabled' => true];
            }

            $paymentIntent = PaymentIntent::create($paymentIntentData);

            // Create pending payment record
            Payment::create([
                'tenant_id' => $tenant->id,
                'invoice_id' => $invoice->id,
                'user_id' => auth()->id(),
                'stripe_payment_intent_id' => $paymentIntent->id,
                'stripe_customer_id' => $customer->id,
                'amount' => $invoice->total,
                'currency' => $invoice->currency ?? 'EUR',
                'status' => 'pending',
                'payment_type' => 'invoice',
                'payment_method' => 'stripe_card',
            ]);

            return $paymentIntent;

        } catch (Exception $e) {
            Log::error('Stripe payment intent creation failed', [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Retrieve payment intent
     */
    public function retrievePaymentIntent(string $paymentIntentId): PaymentIntent
    {
        return PaymentIntent::retrieve($paymentIntentId);
    }

    /**
     * Confirm payment intent
     */
    public function confirmPaymentIntent(string $paymentIntentId, array $options = []): PaymentIntent
    {
        return PaymentIntent::retrieve($paymentIntentId)->confirm($options);
    }

    /**
     * Handle successful payment
     */
    public function handleSuccessfulPayment(PaymentIntent $paymentIntent): ?Payment
    {
        try {
            $invoiceId = $paymentIntent->metadata->invoice_id ?? null;

            if (!$invoiceId) {
                Log::warning('Payment intent missing invoice_id metadata', [
                    'payment_intent_id' => $paymentIntent->id,
                ]);
                return null;
            }

            $payment = Payment::where('stripe_payment_intent_id', $paymentIntent->id)->first();

            if (!$payment) {
                Log::warning('Payment record not found for payment intent', [
                    'payment_intent_id' => $paymentIntent->id,
                ]);
                return null;
            }

            $payment->update([
                'status' => 'succeeded',
                'stripe_charge_id' => $paymentIntent->latest_charge,
                'stripe_payment_method' => $paymentIntent->payment_method,
                'paid_at' => now(),
                'receipt_url' => $paymentIntent->charges->data[0]->receipt_url ?? null,
            ]);

            // Update invoice status
            $invoice = $payment->invoice;
            if ($invoice) {
                $invoice->markAsPaid();
            }

            return $payment;

        } catch (Exception $e) {
            Log::error('Error handling successful payment', [
                'payment_intent_id' => $paymentIntent->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Handle failed payment
     */
    public function handleFailedPayment(PaymentIntent $paymentIntent): ?Payment
    {
        try {
            $payment = Payment::where('stripe_payment_intent_id', $paymentIntent->id)->first();

            if (!$payment) {
                return null;
            }

            $payment->markAsFailed($paymentIntent->last_payment_error->message ?? 'Payment failed');

            return $payment;

        } catch (Exception $e) {
            Log::error('Error handling failed payment', [
                'payment_intent_id' => $paymentIntent->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Refund a payment
     */
    public function refundPayment(Payment $payment, ?float $amount = null, ?string $reason = null): Refund
    {
        try {
            if (!$payment->stripe_charge_id) {
                throw new Exception('Payment does not have a Stripe charge ID');
            }

            $refundData = [
                'charge' => $payment->stripe_charge_id,
            ];

            if ($amount) {
                $refundData['amount'] = (int) ($amount * 100); // Convert to cents
            }

            if ($reason) {
                $refundData['reason'] = $reason;
            }

            $refundData['metadata'] = [
                'payment_id' => $payment->id,
                'invoice_id' => $payment->invoice_id,
            ];

            $refund = Refund::create($refundData);

            // Update payment record
            $refundedAmount = $amount ?? $payment->amount;
            $payment->update([
                'status' => 'refunded',
                'refunded_amount' => $refundedAmount,
                'refunded_at' => now(),
            ]);

            return $refund;

        } catch (Exception $e) {
            Log::error('Stripe refund failed', [
                'payment_id' => $payment->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Get or create a Stripe customer for a client
     */
    protected function getOrCreateCustomer(Tenant $tenant, $client): Customer
    {
        // Check if client already has a Stripe customer ID
        if ($client->stripe_customer_id) {
            try {
                return Customer::retrieve($client->stripe_customer_id);
            } catch (Exception $e) {
                Log::warning('Failed to retrieve existing Stripe customer', [
                    'customer_id' => $client->stripe_customer_id,
                    'error' => $e->getMessage(),
                ]);
                // Will create a new customer below
            }
        }

        // Create new customer
        $customerData = [
            'email' => $client->email,
            'name' => $client->name,
            'metadata' => [
                'client_id' => $client->id,
                'tenant_id' => $tenant->id,
            ],
        ];

        if ($client->phone) {
            $customerData['phone'] = $client->phone;
        }

        if ($client->address) {
            $customerData['address'] = [
                'line1' => $client->address,
                'postal_code' => $client->postal_code ?? '',
                'city' => $client->city ?? '',
                'country' => $client->country ?? 'FR',
            ];
        }

        $customer = Customer::create($customerData);

        // Save customer ID to client
        $client->update(['stripe_customer_id' => $customer->id]);

        return $customer;
    }

    /**
     * Cancel a payment intent
     */
    public function cancelPaymentIntent(string $paymentIntentId): PaymentIntent
    {
        try {
            $paymentIntent = PaymentIntent::retrieve($paymentIntentId);
            $paymentIntent->cancel();

            // Update payment record
            $payment = Payment::where('stripe_payment_intent_id', $paymentIntentId)->first();
            if ($payment) {
                $payment->update(['status' => 'cancelled']);
            }

            return $paymentIntent;

        } catch (Exception $e) {
            Log::error('Failed to cancel payment intent', [
                'payment_intent_id' => $paymentIntentId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
