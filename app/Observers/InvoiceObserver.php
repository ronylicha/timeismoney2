<?php

namespace App\Observers;

use App\Models\Invoice;
use App\Services\QualifiedTimestampService;
use App\Services\ArchiveService;
use App\Services\FacturXService;
use Illuminate\Support\Facades\Log;

class InvoiceObserver
{
    private QualifiedTimestampService $timestampService;
    private ArchiveService $archiveService;
    private FacturXService $facturXService;

    public function __construct()
    {
        $this->timestampService = app(QualifiedTimestampService::class);
        $this->archiveService = app(ArchiveService::class);
        $this->facturXService = app(FacturXService::class);
    }

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

        // === HORODATAGE QUALIFIÉ & ARCHIVAGE NF525 ===
        
        // 1. Facture validée (draft → sent)
        if ($invoice->wasChanged('status') && $invoice->status === 'sent' && $invoice->getOriginal('status') === 'draft') {
            $this->handleInvoiceValidation($invoice);
        }

        // 2. Facture payée
        if ($invoice->wasChanged('payment_status') && $invoice->payment_status === 'paid') {
            $this->handleInvoicePaid($invoice);
        }

        // 3. Facture annulée
        if ($invoice->wasChanged('status') && $invoice->status === 'cancelled') {
            $this->handleInvoiceCancelled($invoice);
        }
    }

    /**
     * Gère la validation d'une facture (draft → sent)
     * - Horodatage qualifié
     * - Archivage FacturX automatique
     */
    private function handleInvoiceValidation(Invoice $invoice): void
    {
        try {
            // 1. Créer un horodatage qualifié
            $timestamp = $this->timestampService->timestamp($invoice, 'invoice_validated');
            
            Log::info('Invoice validated and timestamped', [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'timestamp_id' => $timestamp->id
            ]);

            // 2. Archiver automatiquement en FacturX si configuré
            if (config('archive.auto_archive_enabled') && config('archive.auto_archive_types.invoice')) {
                $this->archiveInvoiceFacturX($invoice);
            }

        } catch (\Exception $e) {
            Log::error('Failed to timestamp/archive validated invoice', [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Gère le paiement d'une facture
     * - Horodatage qualifié
     */
    private function handleInvoicePaid(Invoice $invoice): void
    {
        try {
            $timestamp = $this->timestampService->timestamp($invoice, 'invoice_paid');
            
            Log::info('Invoice paid and timestamped', [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'timestamp_id' => $timestamp->id
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to timestamp paid invoice', [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Gère l'annulation d'une facture
     * - Horodatage qualifié
     */
    private function handleInvoiceCancelled(Invoice $invoice): void
    {
        try {
            $timestamp = $this->timestampService->timestamp($invoice, 'invoice_cancelled');
            
            Log::info('Invoice cancelled and timestamped', [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'timestamp_id' => $timestamp->id
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to timestamp cancelled invoice', [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Archive une facture au format FacturX
     */
    private function archiveInvoiceFacturX(Invoice $invoice): void
    {
        try {
            // Générer le FacturX
            $facturXContent = $this->facturXService->generateFacturX($invoice);
            
            if (!$facturXContent) {
                throw new \Exception('Failed to generate FacturX');
            }

            // Archiver
            $archive = $this->archiveService->archiveInvoice($invoice, $facturXContent, 'automatic');
            
            Log::info('Invoice automatically archived', [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'archive_id' => $archive->id,
                'file_size' => $archive->getFormattedFileSize()
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to archive invoice', [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage()
            ]);
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
