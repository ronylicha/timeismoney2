<?php

namespace App\Observers;

use App\Models\CreditNote;
use App\Models\Invoice;
use App\Services\QualifiedTimestampService;
use App\Services\ArchiveService;
use App\Services\FacturXService;
use Illuminate\Support\Facades\Log;

/**
 * Observer pour les CreditNotes
 * 
 * Met à jour automatiquement les champs de tracking sur la facture liée :
 * - has_credit_notes
 * - total_credited
 * - balance_due
 * 
 * + Horodatage qualifié NF525
 * + Archivage automatique FacturX
 */
class CreditNoteObserver
{
    private ArchiveService $archiveService;
    private FacturXService $facturXService;

    public function __construct()
    {
        $this->archiveService = app(ArchiveService::class);
        $this->facturXService = app(FacturXService::class);
    }

    /**
     * Handle the CreditNote "created" event.
     */
    public function created(CreditNote $creditNote): void
    {
        if ($creditNote->invoice_id) {
            $this->updateInvoiceCredits($creditNote->invoice);
        }

        // === HORODATAGE QUALIFIÉ & ARCHIVAGE NF525 ===
        $this->handleCreditNoteCreation($creditNote);
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
     * Gère la création d'un avoir
     * - Horodatage qualifié
     * - Archivage FacturX automatique
     */
    private function handleCreditNoteCreation(CreditNote $creditNote): void
    {
        try {
            // 1. Créer un horodatage qualifié
            $timestampService = new QualifiedTimestampService($creditNote->tenant);
            $timestamp = $timestampService->timestamp($creditNote, 'credit_note_created');
            
            Log::info('Credit note created and timestamped', [
                'credit_note_id' => $creditNote->id,
                'credit_note_number' => $creditNote->credit_note_number,
                'timestamp_id' => $timestamp->id
            ]);

            // 2. Archiver automatiquement en FacturX si configuré
            if (config('archive.auto_archive_enabled') && config('archive.auto_archive_types.credit_note')) {
                $this->archiveCreditNoteFacturX($creditNote);
            }

        } catch (\Exception $e) {
            Log::error('Failed to timestamp/archive credit note', [
                'credit_note_id' => $creditNote->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Archive un avoir au format FacturX
     */
    private function archiveCreditNoteFacturX(CreditNote $creditNote): void
    {
        try {
            // Générer le FacturX
            $facturXContent = $this->facturXService->generateFacturXForCreditNote($creditNote);
            
            if (!$facturXContent) {
                throw new \Exception('Failed to generate FacturX for credit note');
            }

            // Archiver
            $archive = $this->archiveService->archiveCreditNote($creditNote, $facturXContent, 'automatic');
            
            Log::info('Credit note automatically archived', [
                'credit_note_id' => $creditNote->id,
                'credit_note_number' => $creditNote->credit_note_number,
                'archive_id' => $archive->id,
                'file_size' => $archive->getFormattedFileSize()
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to archive credit note', [
                'credit_note_id' => $creditNote->id,
                'error' => $e->getMessage()
            ]);
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
