<?php

namespace App\Notifications;

use App\Models\Payment;
use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;

class PaymentReceived extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private Payment $payment,
        private Invoice $invoice
    ) {
    }

    public function via($notifiable): array
    {
        return ['mail', 'database', 'push'];
    }

    public function toMail($notifiable)
    {
        $locale = $notifiable->language ?? 'fr';
        
        return (new \App\Mail\PaymentReceivedMail($this->payment, $this->invoice, $locale))
            ->to($notifiable->email);
    }

    public function toDatabase($notifiable)
    {
        $locale = $notifiable->language ?? 'fr';
        
        return [
            'title' => $this->getTitle($locale),
            'message' => $this->getMessage($locale),
            'type' => 'payment_received',
            'icon' => 'credit-card',
            'color' => 'green',
            'data' => [
                'payment_id' => $this->payment->id,
                'invoice_id' => $this->invoice->id,
                'invoice_number' => $this->invoice->invoice_number,
                'amount' => $this->payment->amount,
                'currency' => $this->payment->currency,
                'payment_method' => $this->payment->payment_method,
                'payment_date' => $this->payment->payment_date,
            ],
            'action_url' => "/invoices/{$this->invoice->id}",
            'action_text' => $this->getActionText($locale),
        ];
    }

    public function toPush($notifiable)
    {
        $locale = $notifiable->language ?? 'fr';
        
        return [
            'title' => $this->getTitle($locale),
            'body' => $this->getPushMessage($locale),
            'data' => [
                'type' => 'payment_received',
                'payment_id' => $this->payment->id,
                'invoice_id' => $this->invoice->id,
                'amount' => $this->payment->amount,
                'currency' => $this->payment->currency,
            ],
            'action_url' => "/invoices/{$this->invoice->id}",
        ];
    }

    private function getTitle(string $locale): string
    {
        return match($locale) {
            'fr' => 'Paiement reçu',
            'en' => 'Payment Received',
            'es' => 'Pago recibido',
            default => 'Payment Received',
        };
    }

    private function getMessage(string $locale): string
    {
        $amount = number_format($this->payment->amount, 2);
        $currency = $this->payment->currency;
        $invoiceNumber = $this->invoice->invoice_number;

        return match($locale) {
            'fr' => "Un paiement de {$amount} {$currency} a été reçu pour la facture #{$invoiceNumber}.",
            'en' => "A payment of {$amount} {$currency} has been received for invoice #{$invoiceNumber}.",
            'es' => "Se ha recibido un pago de {$amount} {$currency} para la factura #{$invoiceNumber}.",
            default => "A payment of {$amount} {$currency} has been received for invoice #{$invoiceNumber}.",
        };
    }

    private function getPushMessage(string $locale): string
    {
        $amount = number_format($this->payment->amount, 2);
        $currency = $this->payment->currency;

        return match($locale) {
            'fr' => "Paiement de {$amount} {$currency} reçu",
            'en' => "Payment of {$amount} {$currency} received",
            'es' => "Pago de {$amount} {$currency} recibido",
            default => "Payment of {$amount} {$currency} received",
        };
    }

    private function getActionText(string $locale): string
    {
        return match($locale) {
            'fr' => 'Voir la facture',
            'en' => 'View Invoice',
            'es' => 'Ver factura',
            default => 'View Invoice',
        };
    }
}