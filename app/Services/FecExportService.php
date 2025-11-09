<?php

namespace App\Services;

use App\Models\CreditNote;
use App\Models\Invoice;
use App\Models\InvoiceAuditLog;
use Illuminate\Support\Facades\Log;

/**
 * Service d'export FEC (Fichier des Écritures Comptables)
 * 
 * Conforme à l'article A47 A-1 du Livre des Procédures Fiscales (LPF)
 * Format requis par l'administration fiscale française
 * 
 * Fonctionnalités:
 * - Export FEC complet pour une période
 * - Export audit trail par facture
 * - Export audit trail par lot de factures
 * - Support des avoirs (écritures inversées)
 */
class FecExportService
{
    /**
     * Export FEC complet pour une période donnée
     * 
     * @param int $tenantId
     * @param string $startDate Format Y-m-d
     * @param string $endDate Format Y-m-d
     * @param string $format txt ou csv
     * @param string $encoding utf8 ou cp1252
     * @return string Contenu du fichier FEC
     */
    public function exportFecForPeriod(
        int $tenantId,
        string $startDate,
        string $endDate,
        string $format = 'txt',
        string $encoding = 'utf8'
    ): string {
        // Récupérer les factures de la période
        $invoices = Invoice::where('tenant_id', $tenantId)
            ->whereBetween('date', [$startDate, $endDate])
            ->whereNotIn('status', ['draft'])
            ->with(['client', 'items', 'payments'])
            ->orderBy('date')
            ->get();

        // Récupérer les avoirs de la période
        $creditNotes = CreditNote::where('tenant_id', $tenantId)
            ->whereBetween('credit_note_date', [$startDate, $endDate])
            ->whereNotIn('status', ['draft'])
            ->with(['client', 'items', 'invoice'])
            ->orderBy('credit_note_date')
            ->get();

        $entries = [];

        // Convertir factures en écritures FEC
        foreach ($invoices as $invoice) {
            $entries = array_merge($entries, $this->invoiceToFecEntries($invoice));
        }

        // Convertir avoirs en écritures FEC
        foreach ($creditNotes as $creditNote) {
            $entries = array_merge($entries, $this->creditNoteToFecEntries($creditNote));
        }

        // Trier par date
        usort($entries, function ($a, $b) {
            return strcmp($a['EcritureDate'], $b['EcritureDate']);
        });

        Log::info('FEC export generated', [
            'tenant_id' => $tenantId,
            'period' => [$startDate, $endDate],
            'invoices_count' => $invoices->count(),
            'credit_notes_count' => $creditNotes->count(),
            'entries_count' => count($entries)
        ]);

        return $this->formatFecFile($entries, $format, $encoding);
    }

    /**
     * Export audit trail pour une facture spécifique
     * 
     * @param int $invoiceId
     * @param string $format
     * @param string $encoding
     * @return string
     */
    public function exportInvoiceAuditTrail(
        int $invoiceId,
        string $format = 'txt',
        string $encoding = 'utf8'
    ): string {
        $invoice = Invoice::with(['auditLogs.user', 'creditNotes'])
            ->findOrFail($invoiceId);

        $entries = [];

        // Ajouter les écritures de la facture
        $entries = array_merge($entries, $this->invoiceToFecEntries($invoice));

        // Ajouter les écritures des avoirs liés
        foreach ($invoice->creditNotes as $creditNote) {
            $entries = array_merge($entries, $this->creditNoteToFecEntries($creditNote));
        }

        // Ajouter les entrées d'audit trail
        foreach ($invoice->auditLogs as $auditLog) {
            $entries[] = $this->auditLogToFecEntry($invoice, $auditLog);
        }

        return $this->formatFecFile($entries, $format, $encoding);
    }

    /**
     * Export audit trail pour un lot de factures
     * 
     * @param array $invoiceIds
     * @param string $format
     * @param string $encoding
     * @return string
     */
    public function exportBatchAuditTrail(
        array $invoiceIds,
        string $format = 'txt',
        string $encoding = 'utf8'
    ): string {
        $entries = [];

        foreach ($invoiceIds as $invoiceId) {
            $invoice = Invoice::with(['auditLogs.user', 'creditNotes'])
                ->find($invoiceId);

            if (!$invoice) {
                continue;
            }

            // Écritures facture
            $entries = array_merge($entries, $this->invoiceToFecEntries($invoice));

            // Écritures avoirs
            foreach ($invoice->creditNotes as $creditNote) {
                $entries = array_merge($entries, $this->creditNoteToFecEntries($creditNote));
            }

            // Audit logs
            foreach ($invoice->auditLogs as $auditLog) {
                $entries[] = $this->auditLogToFecEntry($invoice, $auditLog);
            }
        }

        return $this->formatFecFile($entries, $format, $encoding);
    }

    /**
     * Convertit une facture en écritures FEC
     * 
     * @param Invoice $invoice
     * @return array
     */
    private function invoiceToFecEntries(Invoice $invoice): array
    {
        $entries = [];

        // Écriture 1: Débit client (411)
        $entries[] = [
            'JournalCode' => 'VE',
            'JournalLib' => 'Journal des ventes',
            'EcritureNum' => $invoice->invoice_number,
            'EcritureDate' => $invoice->date->format('Ymd'),
            'CompteNum' => '411',
            'CompteLib' => 'Clients',
            'CompAuxNum' => (string) $invoice->client_id,
            'CompAuxLib' => $this->sanitizeForFec($invoice->client->name ?? 'Client'),
            'PieceRef' => $invoice->invoice_number,
            'PieceDate' => $invoice->date->format('Ymd'),
            'EcritureLib' => $this->sanitizeForFec("Facture {$invoice->invoice_number}"),
            'Debit' => number_format($invoice->total, 2, '.', ''),
            'Credit' => '0.00',
            'EcritureLet' => '',
            'DateLet' => '',
            'ValidDate' => $invoice->date->format('Ymd'),
            'Montantdevise' => '',
            'Idevise' => 'EUR'
        ];

        // Écriture 2: Crédit vente (707)
        $entries[] = [
            'JournalCode' => 'VE',
            'JournalLib' => 'Journal des ventes',
            'EcritureNum' => $invoice->invoice_number,
            'EcritureDate' => $invoice->date->format('Ymd'),
            'CompteNum' => '707',
            'CompteLib' => 'Ventes de prestations de services',
            'CompAuxNum' => '',
            'CompAuxLib' => '',
            'PieceRef' => $invoice->invoice_number,
            'PieceDate' => $invoice->date->format('Ymd'),
            'EcritureLib' => $this->sanitizeForFec("Vente {$invoice->invoice_number}"),
            'Debit' => '0.00',
            'Credit' => number_format($invoice->subtotal, 2, '.', ''),
            'EcritureLet' => '',
            'DateLet' => '',
            'ValidDate' => $invoice->date->format('Ymd'),
            'Montantdevise' => '',
            'Idevise' => 'EUR'
        ];

        // Écriture 3: Crédit TVA collectée (4457) si applicable
        if ($invoice->tax_amount > 0) {
            $entries[] = [
                'JournalCode' => 'VE',
                'JournalLib' => 'Journal des ventes',
                'EcritureNum' => $invoice->invoice_number,
                'EcritureDate' => $invoice->date->format('Ymd'),
                'CompteNum' => '4457',
                'CompteLib' => 'TVA collectee',
                'CompAuxNum' => '',
                'CompAuxLib' => '',
                'PieceRef' => $invoice->invoice_number,
                'PieceDate' => $invoice->date->format('Ymd'),
                'EcritureLib' => $this->sanitizeForFec("TVA {$invoice->invoice_number}"),
                'Debit' => '0.00',
                'Credit' => number_format($invoice->tax_amount, 2, '.', ''),
                'EcritureLet' => '',
                'DateLet' => '',
                'ValidDate' => $invoice->date->format('Ymd'),
                'Montantdevise' => '',
                'Idevise' => 'EUR'
            ];
        }

        return $entries;
    }

    /**
     * Convertit un avoir en écritures FEC (montants inversés)
     * 
     * @param CreditNote $creditNote
     * @return array
     */
    private function creditNoteToFecEntries(CreditNote $creditNote): array
    {
        $entries = [];

        // Écriture 1: Crédit client (411) - INVERSÉ
        $entries[] = [
            'JournalCode' => 'VE',
            'JournalLib' => 'Journal des ventes',
            'EcritureNum' => $creditNote->credit_note_number,
            'EcritureDate' => $creditNote->credit_note_date->format('Ymd'),
            'CompteNum' => '411',
            'CompteLib' => 'Clients',
            'CompAuxNum' => (string) $creditNote->client_id,
            'CompAuxLib' => $this->sanitizeForFec($creditNote->client->name ?? 'Client'),
            'PieceRef' => $creditNote->credit_note_number,
            'PieceDate' => $creditNote->credit_note_date->format('Ymd'),
            'EcritureLib' => $this->sanitizeForFec("Avoir {$creditNote->credit_note_number}"),
            'Debit' => '0.00',
            'Credit' => number_format($creditNote->total, 2, '.', ''), // INVERSÉ
            'EcritureLet' => '',
            'DateLet' => '',
            'ValidDate' => $creditNote->credit_note_date->format('Ymd'),
            'Montantdevise' => '',
            'Idevise' => 'EUR'
        ];

        // Écriture 2: Débit vente (707) - INVERSÉ (annulation vente)
        $entries[] = [
            'JournalCode' => 'VE',
            'JournalLib' => 'Journal des ventes',
            'EcritureNum' => $creditNote->credit_note_number,
            'EcritureDate' => $creditNote->credit_note_date->format('Ymd'),
            'CompteNum' => '707',
            'CompteLib' => 'Ventes de prestations de services',
            'CompAuxNum' => '',
            'CompAuxLib' => '',
            'PieceRef' => $creditNote->credit_note_number,
            'PieceDate' => $creditNote->credit_note_date->format('Ymd'),
            'EcritureLib' => $this->sanitizeForFec("Annulation vente {$creditNote->credit_note_number}"),
            'Debit' => number_format($creditNote->subtotal, 2, '.', ''), // INVERSÉ
            'Credit' => '0.00',
            'EcritureLet' => '',
            'DateLet' => '',
            'ValidDate' => $creditNote->credit_note_date->format('Ymd'),
            'Montantdevise' => '',
            'Idevise' => 'EUR'
        ];

        // Écriture 3: Débit TVA (4457) si applicable - INVERSÉ
        if ($creditNote->tax > 0) {
            $entries[] = [
                'JournalCode' => 'VE',
                'JournalLib' => 'Journal des ventes',
                'EcritureNum' => $creditNote->credit_note_number,
                'EcritureDate' => $creditNote->credit_note_date->format('Ymd'),
                'CompteNum' => '4457',
                'CompteLib' => 'TVA collectee',
                'CompAuxNum' => '',
                'CompAuxLib' => '',
                'PieceRef' => $creditNote->credit_note_number,
                'PieceDate' => $creditNote->credit_note_date->format('Ymd'),
                'EcritureLib' => $this->sanitizeForFec("Annulation TVA {$creditNote->credit_note_number}"),
                'Debit' => number_format($creditNote->tax, 2, '.', ''), // INVERSÉ
                'Credit' => '0.00',
                'EcritureLet' => '',
                'DateLet' => '',
                'ValidDate' => $creditNote->credit_note_date->format('Ymd'),
                'Montantdevise' => '',
                'Idevise' => 'EUR'
            ];
        }

        return $entries;
    }

    /**
     * Convertit un audit log en entrée FEC (pour traçabilité)
     * 
     * @param Invoice $invoice
     * @param InvoiceAuditLog $auditLog
     * @return array
     */
    private function auditLogToFecEntry(Invoice $invoice, InvoiceAuditLog $auditLog): array
    {
        $actionDescription = $this->getAuditActionDescription($auditLog->action);

        return [
            'JournalCode' => 'OD',
            'JournalLib' => 'Operations diverses',
            'EcritureNum' => $invoice->invoice_number . '-AUDIT-' . $auditLog->id,
            'EcritureDate' => $auditLog->timestamp->format('Ymd'),
            'CompteNum' => '890',
            'CompteLib' => 'Bilan douverture',
            'CompAuxNum' => '',
            'CompAuxLib' => '',
            'PieceRef' => $invoice->invoice_number,
            'PieceDate' => $invoice->date->format('Ymd'),
            'EcritureLib' => $this->sanitizeForFec($actionDescription),
            'Debit' => '0.00',
            'Credit' => '0.00',
            'EcritureLet' => '',
            'DateLet' => '',
            'ValidDate' => $auditLog->timestamp->format('Ymd'),
            'Montantdevise' => '',
            'Idevise' => 'EUR'
        ];
    }

    /**
     * Formate le fichier FEC selon les spécifications
     * 
     * @param array $entries
     * @param string $format
     * @param string $encoding
     * @return string
     */
    private function formatFecFile(array $entries, string $format, string $encoding): string
    {
        $separator = '|'; // Pipe obligatoire pour FEC

        // Header (obligatoire)
        $header = implode($separator, [
            'JournalCode',
            'JournalLib',
            'EcritureNum',
            'EcritureDate',
            'CompteNum',
            'CompteLib',
            'CompAuxNum',
            'CompAuxLib',
            'PieceRef',
            'PieceDate',
            'EcritureLib',
            'Debit',
            'Credit',
            'EcritureLet',
            'DateLet',
            'ValidDate',
            'Montantdevise',
            'Idevise'
        ]);

        $lines = [$header];

        // Entries
        foreach ($entries as $entry) {
            $line = implode($separator, [
                $entry['JournalCode'],
                $entry['JournalLib'],
                $entry['EcritureNum'],
                $entry['EcritureDate'],
                $entry['CompteNum'],
                $entry['CompteLib'],
                $entry['CompAuxNum'],
                $entry['CompAuxLib'],
                $entry['PieceRef'],
                $entry['PieceDate'],
                $entry['EcritureLib'],
                $entry['Debit'],
                $entry['Credit'],
                $entry['EcritureLet'],
                $entry['DateLet'],
                $entry['ValidDate'],
                $entry['Montantdevise'],
                $entry['Idevise']
            ]);
            $lines[] = $line;
        }

        $content = implode("\r\n", $lines);

        // Convert encoding if needed
        if ($encoding === 'cp1252') {
            $content = mb_convert_encoding($content, 'Windows-1252', 'UTF-8');
        }

        return $content;
    }

    /**
     * Nettoie une chaîne pour le format FEC
     */
    private function sanitizeForFec(string $value): string
    {
        // Retirer les pipes et caractères de nouvelle ligne
        $cleaned = str_replace(['|', "\r", "\n", "\t"], ' ', $value);
        
        // Retirer les caractères spéciaux problématiques
        $cleaned = preg_replace('/[^\x20-\x7E\xA0-\xFF]/', '', $cleaned);
        
        // Limiter la longueur (max 255 caractères pour la plupart des champs FEC)
        return substr($cleaned, 0, 255);
    }

    /**
     * Obtient la description d'une action d'audit
     */
    private function getAuditActionDescription(string $action): string
    {
        $descriptions = [
            'created' => 'Creation facture',
            'sent' => 'Envoi facture',
            'paid' => 'Paiement facture',
            'cancelled' => 'Annulation facture',
            'modified' => 'Modification facture'
        ];

        return $descriptions[$action] ?? $action;
    }
}
