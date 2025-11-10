<?php

namespace App\Observers;

use App\Models\Payment;
use App\Models\User;
use App\Notifications\PaymentReceived;
use App\Services\QualifiedTimestampService;
use Illuminate\Support\Facades\Log;

/**
 * Observer pour les Payments
 * 
 * Horodatage qualifié NF525 pour les paiements reçus
 */
class PaymentObserver
{
    // No timestamp service in constructor - will be created per payment

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
     * - Notification aux utilisateurs
     */
    private function handlePaymentReceived(Payment $payment): void
    {
        try {
            // Horodatage qualifié
            $timestampService = new QualifiedTimestampService($payment->invoice->tenant);
            $timestamp = $timestampService->timestamp($payment, 'payment_received');
            
            Log::info('Payment received and timestamped', [
                'payment_id' => $payment->id,
                'invoice_id' => $payment->invoice_id,
                'amount' => $payment->amount,
                'payment_method' => $payment->payment_method,
                'timestamp_id' => $timestamp->id
            ]);

            // Envoyer les notifications aux utilisateurs du tenant
            $this->sendPaymentNotifications($payment);

        } catch (\Exception $e) {
            Log::error('Failed to process payment', [
                'payment_id' => $payment->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Envoyer les notifications de paiement reçu
     */
    private function sendPaymentNotifications(Payment $payment): void
    {
        try {
            $tenant = $payment->invoice->tenant;
            
            // Récupérer tous les utilisateurs du tenant qui peuvent voir les factures
            $users = User::where('tenant_id', $tenant->id)
                ->where(function($query) {
                    $query->whereHas('roles', function($q) {
                        $q->whereIn('name', ['admin', 'super_admin']);
                    })->orWhereDoesntHave('roles'); // Utilisateurs sans rôle spécifique
                })
                ->get();

            foreach ($users as $user) {
                try {
                    $user->notify(new PaymentReceived($payment));
                    Log::info('Payment notification sent', [
                        'payment_id' => $payment->id,
                        'user_id' => $user->id,
                        'user_email' => $user->email
                    ]);
                } catch (\Exception $notificationError) {
                    Log::error('Failed to send payment notification', [
                        'payment_id' => $payment->id,
                        'user_id' => $user->id,
                        'error' => $notificationError->getMessage()
                    ]);
                }
            }

        } catch (\Exception $e) {
            Log::error('Failed to get users for payment notifications', [
                'payment_id' => $payment->id,
                'error' => $e->getMessage()
            ]);
        }
    }
}
