<?php

namespace App\Observers;

use App\Models\CreditNote;
use App\Models\Invoice;
use Illuminate\Support\Facades\Log;

/**
 * Observer pour les CreditNotes
 * 
 * Met à jour automatiquement les champs de tracking sur la facture liée :
 * - has_credit_notes
 * - total_credited
 * - balance_due
 */
class CreditNoteObserver
{
    /**
     * Handle the CreditNote "created" event.
     */
    public function created(CreditNote $creditNote): void
    {
        if ($creditNote->invoice_id) {
            $this->updateInvoiceCredits($creditNote->invoice);
        }
    }

    /**
     * Handle the CreditNote "updated" event.
     */
    public function updated(CreditNote $creditNote): void
    {
        if ($creditNote->invoice_id) {
            $this->updateInvoiceCredits($creditNote->invoice);
        }
    }

    /**
     * Handle the CreditNote "deleted" event.
     */
    public function deleted(CreditNote $creditNote): void
    {
        if ($creditNote->invoice_id) {
            $this->updateInvoiceCredits($creditNote->invoice);
        }
    }

    /**
     * Met à jour les totaux d'avoirs sur la facture
     */
    private function updateInvoiceCredits(Invoice $invoice): void
    {
        // Calculer le total des avoirs émis ou appliqués
        $totalCredited = $invoice->creditNotes()
            ->whereIn('status', ['issued', 'applied'])
            ->sum('total');

        // Calculer le total des paiements
        $amountPaid = $invoice->payments()->sum('amount');

        // Mettre à jour les champs
        $invoice->update([
            'has_credit_notes' => $totalCredited > 0,
            'total_credited' => $totalCredited,
            'balance_due' => $invoice->total - $amountPaid - $totalCredited
        ]);

        Log::info('Invoice credits updated', [
            'invoice_id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'total_credited' => $totalCredited,
            'amount_paid' => $amountPaid,
            'balance_due' => $invoice->total - $amountPaid - $totalCredited
        ]);
    }
}
