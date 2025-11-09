<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Tenant;
use Illuminate\Support\Facades\Log;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;

class FrenchComplianceService
{
    /**
     * Génère les mentions légales pour une facture
     */
    public function generateLegalMentions(Invoice $invoice): array
    {
        $tenant = $invoice->tenant;
        $mentions = [];

        // Mentions obligatoires
        $mentions[] = "Facture n°{$invoice->invoice_number}";
        $mentions[] = "Date : {$invoice->date->format('d/m/Y')}";
        $mentions[] = "Échéance : {$invoice->due_date->format('d/m/Y')}";

        // Informations entreprise
        if ($tenant->legal_mention_siret) {
            $mentions[] = "SIRET : {$tenant->legal_mention_siret}";
        }

        if ($tenant->legal_mention_ape) {
            $mentions[] = "Code APE : {$tenant->legal_mention_ape}";
        }

        if ($tenant->is_auto_entrepreneur) {
            $mentions[] = "Auto-entrepreneur - TVA non applicable, art. 293 B du CGI";
        } elseif ($tenant->legal_mention_tva_intracom) {
            $mentions[] = "TVA Intracommunautaire : {$tenant->legal_mention_tva_intracom}";
        }

        // Mentions TVA
        if ($invoice->tax_rate > 0) {
            $mentions[] = "TVA : {$invoice->tax_rate}%";
            $mentions[] = "Montant TVA : {$invoice->tax_amount} €";
        }

        // Mentions paiement
        $mentions[] = "En cas de retard de paiement, une indemnité forfaitaire de 40 € sera due";
        $mentions[] = "Indemnité de retard : 3 fois le taux d'intérêt légal";

        return $mentions;
    }

    /**
     * Valide la conformité d'une facture selon la législation française
     */
    public function validateInvoiceCompliance(Invoice $invoice): array
    {
        $errors = [];
        $warnings = [];
        $info = [];

        // 1. VÉRIFICATIONS OBLIGATOIRES DE BASE
        if (!$invoice->invoice_number) {
            $errors[] = "Numéro de facture manquant (Art. L441-3 Code Commerce)";
        }

        if (!$invoice->date) {
            $errors[] = "Date de facture manquante (Art. L441-3 Code Commerce)";
        }

        if (!$invoice->due_date) {
            $errors[] = "Date d'échéance manquante (Art. L441-3 Code Commerce)";
        }

        if (!$invoice->client) {
            $errors[] = "Client manquant";
        }

        // 2. VÉRIFICATIONS TENANT (ÉMETTEUR)
        $tenant = $invoice->tenant;
        
        if (!$tenant->legal_mention_siret && !$tenant->is_auto_entrepreneur) {
            $errors[] = "SIRET obligatoire (Art. L441-3 Code Commerce)";
        }

        if (!$tenant->rcs_number && !$tenant->is_auto_entrepreneur && in_array($tenant->legal_form, ['SARL', 'SAS', 'SA', 'EURL'])) {
            $warnings[] = "Numéro RCS manquant (obligatoire pour sociétés)";
        }

        if (!$tenant->rcs_city && $tenant->rcs_number) {
            $warnings[] = "Ville du greffe RCS manquante";
        }

        if (!$tenant->capital && in_array($tenant->legal_form, ['SARL', 'SAS', 'SA'])) {
            $warnings[] = "Capital social manquant (obligatoire pour SARL/SAS/SA)";
        }

        if (!$tenant->legal_form) {
            $warnings[] = "Forme juridique non renseignée";
        }

        // 3. VÉRIFICATIONS TVA
        if ($invoice->tax_rate > 0) {
            if (!$tenant->legal_mention_tva_intracom && !$tenant->is_auto_entrepreneur) {
                $warnings[] = "Numéro TVA intracommunautaire manquant";
            }
        }

        if ($tenant->is_auto_entrepreneur && $invoice->tax_rate > 0) {
            $errors[] = "Un auto-entrepreneur ne peut pas facturer de TVA";
        }

        // 4. VÉRIFICATIONS CONDITIONS DE PAIEMENT
        if (!$invoice->payment_conditions || empty($invoice->payment_conditions)) {
            $errors[] = "Conditions de règlement manquantes (Art. L441-3 Code Commerce)";
        }

        if (!$invoice->late_payment_penalty_rate || $invoice->late_payment_penalty_rate <= 0) {
            $errors[] = "Taux de pénalités de retard manquant (minimum 3x taux légal)";
        }

        if (!$invoice->recovery_indemnity || $invoice->recovery_indemnity < 40) {
            $errors[] = "Indemnité forfaitaire de recouvrement doit être de 40€ minimum";
        }

        // 5. VÉRIFICATIONS ESCOMPTE
        if ($invoice->early_payment_discount && $invoice->early_payment_discount > 0) {
            if (!str_contains($invoice->payment_conditions, 'escompte')) {
                $warnings[] = "L'escompte doit être mentionné dans les conditions de paiement";
            }
        }

        // 6. VÉRIFICATIONS COORDONNÉES BANCAIRES (pour QR Code SEPA)
        if (!$tenant->iban) {
            $warnings[] = "IBAN manquant (recommandé pour faciliter les paiements)";
        }

        if (!$tenant->bic && $tenant->iban) {
            $warnings[] = "BIC manquant (recommandé avec IBAN)";
        }

        // 7. VÉRIFICATIONS NUMÉROTATION (NF525)
        if (!$invoice->sequence_number) {
            $errors[] = "Numéro séquentiel manquant (conformité NF525)";
        }

        if (!$invoice->hash) {
            $errors[] = "Hash de sécurité manquant (conformité NF525)";
        }

        if (!$invoice->signature) {
            $errors[] = "Signature cryptographique manquante (conformité NF525)";
        }

        // 8. VÉRIFICATIONS FACTURATION ÉLECTRONIQUE (préparation 2026)
        if ($invoice->electronic_format === 'pdf') {
            $info[] = "Format PDF simple - Migration vers Factur-X recommandée avant 2026";
        }

        if (!$invoice->qr_code_sepa) {
            $info[] = "QR Code SEPA manquant - Facilite les paiements pour les clients";
        }

        // 9. VÉRIFICATIONS RÉFÉRENCES OPTIONNELLES
        if ($invoice->purchase_order_number) {
            $info[] = "Bon de commande référencé : {$invoice->purchase_order_number}";
        }

        if ($invoice->contract_reference) {
            $info[] = "Contrat référencé : {$invoice->contract_reference}";
        }

        // 10. SCORE DE CONFORMITÉ
        $totalChecks = count($errors) + count($warnings) + count($info);
        $passedChecks = $totalChecks - count($errors) - count($warnings);
        $complianceScore = $totalChecks > 0 ? round(($passedChecks / $totalChecks) * 100, 2) : 100;

        return [
            'is_compliant' => empty($errors),
            'compliance_score' => $complianceScore,
            'errors' => $errors,
            'warnings' => $warnings,
            'info' => $info,
            'total_issues' => count($errors) + count($warnings),
            'critical_issues' => count($errors),
        ];
    }

    /**
     * Valide la numérotation séquentielle sans trous
     */
    public function validateSequentialNumbering(int $tenantId): array
    {
        $invoices = Invoice::where('tenant_id', $tenantId)
            ->whereNotNull('sequence_number')
            ->orderBy('sequence_number')
            ->pluck('sequence_number', 'id')
            ->toArray();

        if (empty($invoices)) {
            return [
                'valid' => true,
                'gaps' => [],
                'message' => 'Aucune facture à vérifier'
            ];
        }

        $gaps = [];
        $sequenceNumbers = array_values($invoices);
        $invoiceIds = array_keys($invoices);

        for ($i = 1; $i < count($sequenceNumbers); $i++) {
            $diff = $sequenceNumbers[$i] - $sequenceNumbers[$i - 1];
            
            if ($diff > 1) {
                $gaps[] = [
                    'from_sequence' => $sequenceNumbers[$i - 1],
                    'to_sequence' => $sequenceNumbers[$i],
                    'from_invoice_id' => $invoiceIds[$i - 1],
                    'to_invoice_id' => $invoiceIds[$i],
                    'missing_count' => $diff - 1,
                    'missing_numbers' => range($sequenceNumbers[$i - 1] + 1, $sequenceNumbers[$i] - 1)
                ];
            }
        }

        return [
            'valid' => empty($gaps),
            'gaps' => $gaps,
            'total_invoices' => count($invoices),
            'gaps_count' => count($gaps),
            'message' => empty($gaps) 
                ? 'Numérotation séquentielle valide' 
                : count($gaps) . ' trou(s) détecté(s) dans la numérotation'
        ];
    }

    /**
     * Génère un rapport d'intégrité annuel (pour contrôle fiscal)
     */
    public function generateIntegrityReport(int $tenantId, int $year): array
    {
        $invoices = Invoice::where('tenant_id', $tenantId)
            ->whereYear('date', $year)
            ->orderBy('sequence_number')
            ->get();

        $report = [
            'year' => $year,
            'tenant_id' => $tenantId,
            'generated_at' => now()->toIso8601String(),
            'total_invoices' => $invoices->count(),
            'first_invoice' => null,
            'last_invoice' => null,
            'hash_chain_valid' => true,
            'integrity_issues' => []
        ];

        if ($invoices->isEmpty()) {
            return $report;
        }

        $report['first_invoice'] = [
            'number' => $invoices->first()->invoice_number,
            'date' => $invoices->first()->date->format('Y-m-d'),
            'hash' => $invoices->first()->hash
        ];

        $report['last_invoice'] = [
            'number' => $invoices->last()->invoice_number,
            'date' => $invoices->last()->date->format('Y-m-d'),
            'hash' => $invoices->last()->hash
        ];

        // Vérifier la chaîne de hash
        foreach ($invoices as $index => $invoice) {
            if ($index > 0) {
                $previousInvoice = $invoices[$index - 1];
                if ($invoice->previous_hash !== $previousInvoice->hash) {
                    $report['hash_chain_valid'] = false;
                    $report['integrity_issues'][] = [
                        'invoice_number' => $invoice->invoice_number,
                        'issue' => 'Chaîne de hash interrompue',
                        'expected_previous_hash' => $previousInvoice->hash,
                        'actual_previous_hash' => $invoice->previous_hash
                    ];
                }
            }
        }

        return $report;
    }

    /**
     * Archive légalement une facture (10 ans)
     */
    public function archiveInvoiceLegally(Invoice $invoice): bool
    {
        try {
            $invoice->update([
                'is_archived_legally' => true,
                'legally_archived_at' => now()
            ]);

            Log::info('Invoice archived legally', [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('Failed to archive invoice legally', [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage()
            ]);

            return false;
        }
    }

    /**
     * Génère le hash pour facturation électronique
     */
    public function generateElectronicInvoiceHash(Invoice $invoice): string
    {
        $data = [
            'invoice_number' => $invoice->invoice_number,
            'date' => $invoice->date->format('Y-m-d'),
            'total' => $invoice->total,
            'client_id' => $invoice->client_id,
            'tenant_id' => $invoice->tenant_id
        ];

        return hash('sha256', json_encode($data));
    }

    /**
     * Vérifie si une facture peut être envoyée à Chorus Pro
     */
    public function canSendToChorusPro(Invoice $invoice): array
    {
        $errors = [];

        if ($invoice->status === 'draft') {
            $errors[] = "La facture ne peut pas être envoyée en brouillon";
        }

        $client = $invoice->client;
        if (!$client->is_public_entity || $client->country !== 'FR') {
            $errors[] = "Le client doit être une entité publique française";
        }

        $tenant = $invoice->tenant;
        if (!$tenant->legal_mention_siret) {
            $errors[] = "Le SIRET est obligatoire pour Chorus Pro";
        }

        return [
            'can_send' => empty($errors),
            'errors' => $errors
        ];
    }

    /**
     * Génère un QR Code SEPA pour faciliter le paiement
     * Format: EPC (European Payments Council) QR Code
     * 
     * @param Invoice $invoice
     * @return string|null SVG du QR Code ou null si IBAN manquant
     */
    public function generateSepaQrCode(Invoice $invoice): ?string
    {
        $tenant = $invoice->tenant;

        // Vérifier que l'IBAN est présent
        if (!$tenant->iban) {
            Log::warning('Cannot generate SEPA QR Code: IBAN missing', [
                'invoice_id' => $invoice->id,
                'tenant_id' => $tenant->id
            ]);
            return null;
        }

        // Format EPC QR Code (version 002)
        // Référence: https://www.europeanpaymentscouncil.eu/document-library/guidance-documents/quick-response-code-guidelines-enable-data-capture-initiation
        $sepaData = [
            'BCD',                                          // Service Tag
            '002',                                          // Version
            '1',                                            // Character set (1 = UTF-8)
            'SCT',                                          // Identification (SEPA Credit Transfer)
            $tenant->bic ?? '',                             // BIC (optionnel si zone SEPA)
            $this->sanitizeSepaField($tenant->company_name ?? $tenant->name, 70), // Beneficiary Name
            $this->formatIban($tenant->iban),               // Beneficiary Account (IBAN)
            'EUR' . number_format($invoice->total, 2, '.', ''), // Amount (EUR + montant)
            '',                                             // Purpose (optionnel)
            $this->sanitizeSepaField($invoice->invoice_number, 35), // Structured Reference
            $this->sanitizeSepaField("Facture {$invoice->invoice_number}", 140), // Unstructured Remittance
            ''                                              // Beneficiary to Originator Information
        ];

        try {
            $renderer = new ImageRenderer(
                new RendererStyle(200, 2),
                new SvgImageBackEnd()
            );
            $writer = new Writer($renderer);
            $qrCodeSvg = $writer->writeString(implode("\n", $sepaData));

            return $qrCodeSvg;
        } catch (\Exception $e) {
            Log::error('Failed to generate SEPA QR Code', [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Formate un IBAN en retirant les espaces
     */
    private function formatIban(string $iban): string
    {
        return strtoupper(str_replace(' ', '', $iban));
    }

    /**
     * Nettoie un champ pour le format SEPA (retire caractères spéciaux)
     */
    private function sanitizeSepaField(string $value, int $maxLength): string
    {
        // Retirer les caractères non autorisés dans SEPA
        $cleaned = preg_replace('/[^a-zA-Z0-9\s\-\.\,\+\(\)\/\:\?\'\&]/', '', $value);
        
        // Limiter la longueur
        return substr($cleaned, 0, $maxLength);
    }

    /**
     * Génère et sauvegarde le QR Code SEPA pour une facture
     */
    public function generateAndSaveSepaQrCode(Invoice $invoice): bool
    {
        $qrCode = $this->generateSepaQrCode($invoice);

        if (!$qrCode) {
            return false;
        }

        try {
            $invoice->update(['qr_code_sepa' => $qrCode]);
            
            Log::info('SEPA QR Code generated and saved', [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('Failed to save SEPA QR Code', [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
}
