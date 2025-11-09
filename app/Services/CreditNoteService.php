<?php

namespace App\Services;

use App\Models\CreditNote;
use App\Models\CreditNoteItem;
use App\Models\Invoice;
use App\Models\InvoiceAuditLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Service de gestion des avoirs (Credit Notes)
 * 
 * Fonctionnalités :
 * - Création d'avoir depuis une facture (total ou partiel)
 * - Annulation complète de facture
 * - Validation des montants
 * - Traçabilité et conformité NF525
 */
class CreditNoteService
{
    /**
     * Crée un avoir depuis une facture (total ou partiel)
     * 
     * @param Invoice $invoice Facture d'origine
     * @param array $selectedItems Items sélectionnés avec quantités (optionnel)
     * @param bool $fullCredit Créer un avoir total ?
     * @param string|null $reason Motif de l'avoir
     * @return CreditNote
     * @throws \Exception
     */
    public function createFromInvoice(
        Invoice $invoice, 
        array $selectedItems = [], 
        bool $fullCredit = true,
        ?string $reason = null
    ): CreditNote {
        // Validation
        $this->validateCreditCreation($invoice);
        
        DB::beginTransaction();
        try {
            // Générer le numéro d'avoir
            $creditNoteNumber = CreditNote::generateNumber($invoice->tenant_id);
            
            // Calculer les totaux
            $totals = $this->calculateCreditTotals($invoice, $selectedItems, $fullCredit);
            
            // Valider que le montant ne dépasse pas le restant
            $this->validateCreditAmount($invoice, $totals['total']);
            
            // Créer l'avoir
            $creditNote = CreditNote::create([
                'tenant_id' => $invoice->tenant_id,
                'client_id' => $invoice->client_id,
                'invoice_id' => $invoice->id,
                'credit_note_number' => $creditNoteNumber,
                'credit_note_date' => now(),
                'reason' => $reason ?? 'Avoir sur facture ' . $invoice->invoice_number,
                'description' => $fullCredit 
                    ? "Avoir total pour annulation de la facture {$invoice->invoice_number}"
                    : "Avoir partiel sur la facture {$invoice->invoice_number}",
                'status' => 'draft',
                'subtotal' => $totals['subtotal'],
                'tax' => $totals['tax'],
                'discount' => 0,
                'total' => $totals['total'],
                'currency' => $invoice->currency ?? 'EUR',
                'payment_method' => $invoice->payment_method,
            ]);
            
            // Créer les lignes d'avoir
            if ($fullCredit) {
                $this->copyAllItems($invoice, $creditNote);
            } else {
                $this->copySelectedItems($invoice, $creditNote, $selectedItems);
            }
            
            // Créer l'entrée d'audit trail
            $this->createAuditLog($invoice, $creditNote);
            
            DB::commit();
            
            Log::info('Credit note created from invoice', [
                'credit_note_id' => $creditNote->id,
                'credit_note_number' => $creditNote->credit_note_number,
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'amount' => $creditNote->total,
                'full_credit' => $fullCredit
            ]);
            
            return $creditNote;
            
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Failed to create credit note from invoice', [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * Annule complètement une facture en créant un avoir total
     * 
     * @param Invoice $invoice
     * @param string $reason Motif d'annulation
     * @return CreditNote
     * @throws \Exception
     */
    public function cancelInvoice(Invoice $invoice, string $reason): CreditNote
    {
        if (!$invoice->canBeCancelled()) {
            throw new \Exception("La facture ne peut pas être annulée (déjà annulée ou avoir total émis)");
        }
        
        DB::beginTransaction();
        try {
            // Créer l'avoir total
            $creditNote = $this->createFromInvoice(
                $invoice, 
                [], 
                fullCredit: true,
                reason: $reason
            );
            
            // Émettre l'avoir automatiquement
            $creditNote->markAsIssued();
            
            // Mettre à jour le statut de la facture
            $invoice->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancellation_reason' => $reason
            ]);
            
            // Créer l'entrée d'audit pour l'annulation
            InvoiceAuditLog::create([
                'invoice_id' => $invoice->id,
                'action' => 'cancelled',
                'signature' => hash('sha256', json_encode([
                    'invoice_id' => $invoice->id,
                    'credit_note_id' => $creditNote->id,
                    'timestamp' => now()->timestamp
                ])),
                'timestamp' => now(),
                'user_id' => auth()->id() ?? 1,
                'ip_address' => request()->ip() ?? '127.0.0.1',
                'user_agent' => request()->userAgent() ?? 'System',
                'changes' => [
                    'status' => ['from' => 'sent', 'to' => 'cancelled'],
                    'reason' => $reason,
                    'credit_note_id' => $creditNote->id,
                    'credit_note_number' => $creditNote->credit_note_number
                ]
            ]);
            
            DB::commit();
            
            Log::info('Invoice cancelled with credit note', [
                'invoice_id' => $invoice->id,
                'credit_note_id' => $creditNote->id,
                'reason' => $reason
            ]);
            
            return $creditNote;
            
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Failed to cancel invoice', [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * Valide qu'un avoir peut être créé pour cette facture
     */
    private function validateCreditCreation(Invoice $invoice): void
    {
        // Ne pas créer d'avoir sur un brouillon
        if ($invoice->status === 'draft') {
            throw new \Exception("Impossible de créer un avoir pour une facture en brouillon");
        }
        
        // Vérifier que la facture n'est pas déjà complètement créditée
        if ($invoice->total_credited >= $invoice->total) {
            throw new \Exception("La facture est déjà entièrement créditée");
        }
    }
    
    /**
     * Valide que le montant de l'avoir ne dépasse pas le restant
     */
    public function validateCreditAmount(Invoice $invoice, float $creditAmount): void
    {
        $totalCredited = $invoice->creditNotes()
            ->whereIn('status', ['issued', 'applied'])
            ->sum('total');
        
        $remaining = $invoice->total - $totalCredited;
        
        if ($creditAmount > $remaining) {
            throw new \Exception(
                "Le montant de l'avoir ({$creditAmount} €) dépasse le montant restant ({$remaining} €)"
            );
        }
    }
    
    /**
     * Calcule les totaux de l'avoir
     */
    private function calculateCreditTotals(
        Invoice $invoice, 
        array $selectedItems, 
        bool $fullCredit
    ): array {
        if ($fullCredit) {
            return [
                'subtotal' => $invoice->subtotal,
                'tax' => $invoice->tax_amount,
                'total' => $invoice->total
            ];
        }
        
        // Calcul pour avoir partiel
        $subtotal = 0;
        $tax = 0;
        
        foreach ($selectedItems as $item) {
            $invoiceItem = $invoice->items()->find($item['id']);
            if (!$invoiceItem) {
                continue;
            }
            
            $quantity = $item['quantity'] ?? $invoiceItem->quantity;
            $itemSubtotal = $quantity * $invoiceItem->unit_price;
            $itemTax = ($itemSubtotal * $invoiceItem->tax_rate) / 100;
            
            $subtotal += $itemSubtotal;
            $tax += $itemTax;
        }
        
        return [
            'subtotal' => $subtotal,
            'tax' => $tax,
            'total' => $subtotal + $tax
        ];
    }
    
    /**
     * Copie tous les items de la facture vers l'avoir
     */
    private function copyAllItems(Invoice $invoice, CreditNote $creditNote): void
    {
        $invoice->load('items');
        
        foreach ($invoice->items as $index => $item) {
            $itemTotal = $item->quantity * $item->unit_price;
            $taxAmount = ($itemTotal * $item->tax_rate) / 100;
            
            CreditNoteItem::create([
                'credit_note_id' => $creditNote->id,
                'description' => $item->description,
                'details' => $item->details,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'tax_rate' => $item->tax_rate,
                'tax_amount' => $taxAmount,
                'total' => $itemTotal,
                'position' => $index + 1,
            ]);
        }
    }
    
    /**
     * Copie les items sélectionnés de la facture vers l'avoir
     */
    private function copySelectedItems(
        Invoice $invoice, 
        CreditNote $creditNote, 
        array $selectedItems
    ): void {
        $position = 1;
        
        foreach ($selectedItems as $selectedItem) {
            $invoiceItem = $invoice->items()->find($selectedItem['id']);
            if (!$invoiceItem) {
                continue;
            }
            
            $quantity = $selectedItem['quantity'] ?? $invoiceItem->quantity;
            $itemTotal = $quantity * $invoiceItem->unit_price;
            $taxAmount = ($itemTotal * $invoiceItem->tax_rate) / 100;
            
            CreditNoteItem::create([
                'credit_note_id' => $creditNote->id,
                'description' => $invoiceItem->description,
                'details' => $invoiceItem->details,
                'quantity' => $quantity,
                'unit_price' => $invoiceItem->unit_price,
                'tax_rate' => $invoiceItem->tax_rate,
                'tax_amount' => $taxAmount,
                'total' => $itemTotal,
                'position' => $position++,
            ]);
        }
    }
    
    /**
     * Crée l'entrée d'audit trail pour la création de l'avoir
     */
    private function createAuditLog(Invoice $invoice, CreditNote $creditNote): void
    {
        InvoiceAuditLog::create([
            'invoice_id' => $invoice->id,
            'action' => 'modified',
            'signature' => hash('sha256', json_encode([
                'invoice_id' => $invoice->id,
                'credit_note_id' => $creditNote->id,
                'credit_note_number' => $creditNote->credit_note_number,
                'amount' => $creditNote->total,
                'timestamp' => now()->timestamp
            ])),
            'timestamp' => now(),
            'user_id' => auth()->id() ?? 1,
            'ip_address' => request()->ip() ?? '127.0.0.1',
            'user_agent' => request()->userAgent() ?? 'System',
            'changes' => [
                'action' => 'credit_note_created',
                'credit_note_id' => $creditNote->id,
                'credit_note_number' => $creditNote->credit_note_number,
                'credit_amount' => $creditNote->total,
                'credit_subtotal' => $creditNote->subtotal,
                'credit_tax' => $creditNote->tax,
                'reason' => $creditNote->reason
            ]
        ]);
    }
}
