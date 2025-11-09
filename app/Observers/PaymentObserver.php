<?php

namespace App\Observers;

use App\Models\Payment;
use App\Services\QualifiedTimestampService;
use Illuminate\Support\Facades\Log;

/**
 * Observer pour les Payments
 * 
 * Horodatage qualifié NF525 pour les paiements reçus
 */
class PaymentObserver
{
    private QualifiedTimestampService $timestampService;

    public function __construct()
    {
        $this->timestampService = app(QualifiedTimestampService::class);
    }

    /**
     * Handle the Payment "created" event.
     */
    public function created(Payment $payment): void
    {
        // Horodater le paiement reçu
        $this->handlePaymentReceived($payment);
    }

    /**
     * Handle the Payment "updated" event.
     */
    public function updated(Payment $payment): void
    {
        //
    }

    /**
     * Handle the Payment "deleted" event.
     */
    public function deleted(Payment $payment): void
    {
        //
    }

    /**
     * Handle the Payment "restored" event.
     */
    public function restored(Payment $payment): void
    {
        //
    }

    /**
     * Handle the Payment "force deleted" event.
     */
    public function forceDeleted(Payment $payment): void
    {
        //
    }

    /**
     * Gère la réception d'un paiement
     * - Horodatage qualifié NF525
     */
    private function handlePaymentReceived(Payment $payment): void
    {
        try {
            $timestamp = $this->timestampService->timestamp($payment, 'payment_received');
            
            Log::info('Payment received and timestamped', [
                'payment_id' => $payment->id,
                'invoice_id' => $payment->invoice_id,
                'amount' => $payment->amount,
                'payment_method' => $payment->payment_method,
                'timestamp_id' => $timestamp->id
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to timestamp payment', [
                'payment_id' => $payment->id,
                'error' => $e->getMessage()
            ]);
        }
    }
}
