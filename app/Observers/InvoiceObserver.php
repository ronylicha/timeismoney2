<?php

namespace App\Observers;

use App\Models\Invoice;

class InvoiceObserver
{
    /**
     * Handle the Invoice "created" event.
     */
    public function created(Invoice $invoice): void
    {
        // Check VAT threshold after invoice creation
        // Only check for paid or sent invoices
        if (in_array($invoice->status, ['paid', 'sent'])) {
            $invoice->tenant->checkAndSendVatThresholdAlerts();
        }
    }

    /**
     * Handle the Invoice "updated" event.
     */
    public function updated(Invoice $invoice): void
    {
        // Check VAT threshold when invoice status changes to paid or sent
        if ($invoice->wasChanged('status') && in_array($invoice->status, ['paid', 'sent'])) {
            $invoice->tenant->checkAndSendVatThresholdAlerts();
        }

        // Also check when amount changes for existing paid/sent invoices
        if ($invoice->wasChanged(['subtotal', 'total', 'tax_amount']) && in_array($invoice->status, ['paid', 'sent'])) {
            $invoice->tenant->checkAndSendVatThresholdAlerts();
        }
    }

    /**
     * Handle the Invoice "deleted" event.
     */
    public function deleted(Invoice $invoice): void
    {
        //
    }

    /**
     * Handle the Invoice "restored" event.
     */
    public function restored(Invoice $invoice): void
    {
        //
    }

    /**
     * Handle the Invoice "force deleted" event.
     */
    public function forceDeleted(Invoice $invoice): void
    {
        //
    }
}
