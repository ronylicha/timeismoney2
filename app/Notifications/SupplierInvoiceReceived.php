<?php

namespace App\Notifications;

use App\Models\SupplierInvoice;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;

class SupplierInvoiceReceived extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private SupplierInvoice $supplierInvoice
    ) {
    }

    public function via($notifiable): array
    {
        return ['mail', 'database', 'push'];
    }

    public function toMail($notifiable)
    {
        $locale = $notifiable->language ?? 'fr';
        
        return (new \App\Mail\SupplierInvoiceReceivedMail($this->supplierInvoice, $locale))
            ->to($notifiable->email);
    }

    public function toDatabase($notifiable)
    {
        $locale = $notifiable->language ?? 'fr';
        
        return [
            'title' => $this->getTitle($locale),
            'message' => $this->getMessage($locale),
            'type' => 'supplier_invoice_received',
            'icon' => 'document-text',
            'color' => 'blue',
            'data' => [
                'supplier_invoice_id' => $this->supplierInvoice->id,
                'invoice_number' => $this->supplierInvoice->invoice_number,
                'supplier_name' => $this->supplierInvoice->supplier_name,
                'total_ttc' => $this->supplierInvoice->total_ttc,
                'currency' => $this->supplierInvoice->currency,
                'due_date' => $this->supplierInvoice->due_date,
                'status' => $this->supplierInvoice->status,
            ],
            'action_url' => "/supplier-invoices/{$this->supplierInvoice->id}",
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
                'type' => 'supplier_invoice_received',
                'supplier_invoice_id' => $this->supplierInvoice->id,
                'supplier_name' => $this->supplierInvoice->supplier_name,
                'total_ttc' => $this->supplierInvoice->total_ttc,
                'currency' => $this->supplierInvoice->currency,
            ],
            'action_url' => "/supplier-invoices/{$this->supplierInvoice->id}",
        ];
    }

    private function getTitle(string $locale): string
    {
        return match($locale) {
            'fr' => 'Facture fournisseur reçue',
            'en' => 'Supplier Invoice Received',
            'es' => 'Factura de proveedor recibida',
            default => 'Supplier Invoice Received',
        };
    }

    private function getMessage(string $locale): string
    {
        $supplierName = $this->supplierInvoice->supplier_name;
        $invoiceNumber = $this->supplierInvoice->invoice_number;
        $amount = number_format($this->supplierInvoice->total_ttc, 2);
        $currency = $this->supplierInvoice->currency;

        return match($locale) {
            'fr' => "Nouvelle facture #{$invoiceNumber} reçue de {$supplierName} pour un montant de {$amount} {$currency}.",
            'en' => "New invoice #{$invoiceNumber} received from {$supplierName} for {$amount} {$currency}.",
            'es' => "Nueva factura #{$invoiceNumber} recibida de {$supplierName} por un importe de {$amount} {$currency}.",
            default => "New invoice #{$invoiceNumber} received from {$supplierName} for {$amount} {$currency}.",
        };
    }

    private function getPushMessage(string $locale): string
    {
        $supplierName = $this->supplierInvoice->supplier_name;
        $amount = number_format($this->supplierInvoice->total_ttc, 2);
        $currency = $this->supplierInvoice->currency;

        return match($locale) {
            'fr' => "Facture de {$amount} {$currency} reçue de {$supplierName}",
            'en' => "Invoice of {$amount} {$currency} received from {$supplierName}",
            'es' => "Factura de {$amount} {$currency} recibida de {$supplierName}",
            default => "Invoice of {$amount} {$currency} received from {$supplierName}",
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