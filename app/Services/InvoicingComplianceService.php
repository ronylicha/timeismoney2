<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\Client;
use Illuminate\Support\Facades\Log;

/**
 * Service de vérification de conformité pour la facturation
 *
 * Vérifie que tous les paramètres obligatoires sont renseignés avant
 * de permettre la création de factures conformes NF525 et EN 16931
 */
class InvoicingComplianceService
{
    /**
     * Vérifie si un tenant peut créer des factures
     *
     * @param Tenant $tenant
     * @return array ['can_invoice' => bool, 'errors' => array, 'warnings' => array]
     */
    public function canTenantCreateInvoices(Tenant $tenant): array
    {
        $errors = [];
        $warnings = [];

        // === DONNÉES OBLIGATOIRES TENANT ===

        // 1. Identification entreprise
        if (empty($tenant->siret)) {
            $errors[] = [
                'field' => 'siret',
                'message' => 'Le numéro SIRET est obligatoire pour émettre des factures en France',
                'severity' => 'critical',
                'category' => 'identification',
            ];
        }

        if (empty($tenant->company_name) && empty($tenant->name)) {
            $errors[] = [
                'field' => 'company_name',
                'message' => 'Le nom de l\'entreprise est obligatoire',
                'severity' => 'critical',
                'category' => 'identification',
            ];
        }

        // 2. Adresse complète (obligatoire EN 16931)
        if (empty($tenant->address_line1)) {
            $errors[] = [
                'field' => 'address_line1',
                'message' => 'L\'adresse de l\'entreprise est obligatoire (conformité EN 16931)',
                'severity' => 'critical',
                'category' => 'address',
            ];
        }

        if (empty($tenant->postal_code)) {
            $errors[] = [
                'field' => 'postal_code',
                'message' => 'Le code postal est obligatoire',
                'severity' => 'critical',
                'category' => 'address',
            ];
        }

        if (empty($tenant->city)) {
            $errors[] = [
                'field' => 'city',
                'message' => 'La ville est obligatoire',
                'severity' => 'critical',
                'category' => 'address',
            ];
        }

        // 3. Régime TVA et numéro TVA
        $vatStatus = $tenant->vat_subject ?? true; // Par défaut assujetti

        if ($vatStatus) {
            // Assujetti à la TVA : numéro obligatoire
            if (empty($tenant->vat_number)) {
                $errors[] = [
                    'field' => 'vat_number',
                    'message' => 'Le numéro de TVA intracommunautaire est obligatoire pour les entreprises assujetties à la TVA',
                    'severity' => 'critical',
                    'category' => 'vat',
                ];
            }
        } else {
            // Non assujetti : motif d'exonération obligatoire
            if (empty($tenant->vat_exemption_reason)) {
                $errors[] = [
                    'field' => 'vat_exemption_reason',
                    'message' => 'Le motif de non-assujettissement à la TVA est obligatoire (sera repris sur les factures)',
                    'severity' => 'critical',
                    'category' => 'vat',
                ];
            }
        }

        // 4. Type d'entreprise (pour obligations spécifiques)
        if (empty($tenant->legal_form)) {
            $warnings[] = [
                'field' => 'legal_form',
                'message' => 'Le type d\'entreprise (SARL, SAS, EI, etc.) devrait être renseigné pour déterminer les mentions légales obligatoires',
                'severity' => 'warning',
                'category' => 'identification',
            ];
        }

        // 5. Capital social (OBLIGATOIRE pour les sociétés UNIQUEMENT)
        // Source: Mentions obligatoires factures 2025 - Gouvernement français
        // Les sociétés (SARL, EURL, SAS, SASU, SA) DOIVENT mentionner leur capital social
        // Les EI, auto-entrepreneurs et associations n'ont PAS de capital social
        $societiesWithCapital = ['SARL', 'EURL', 'SAS', 'SASU', 'SA', 'SNC', 'SCS', 'SCA'];

        if (in_array(strtoupper($tenant->legal_form ?? ''), $societiesWithCapital)) {
            if (empty($tenant->capital) && $tenant->capital !== 0) {
                $errors[] = [
                    'field' => 'capital',
                    'message' => 'Le capital social est OBLIGATOIRE sur les factures pour les ' . $tenant->legal_form . ' (mention légale)',
                    'severity' => 'critical',
                    'category' => 'legal',
                ];
            }
        }

        // 6. RCS (OBLIGATOIRE pour les sociétés commerciales)
        // Source: Mentions obligatoires factures 2025
        // Les sociétés commerciales DOIVENT mentionner leur numéro RCS + ville du greffe
        $commercialCompanies = ['SARL', 'EURL', 'SAS', 'SASU', 'SA', 'SNC'];

        if (in_array(strtoupper($tenant->legal_form ?? ''), $commercialCompanies)) {
            if (empty($tenant->rcs_number)) {
                $errors[] = [
                    'field' => 'rcs_number',
                    'message' => 'Le numéro RCS est OBLIGATOIRE pour les sociétés commerciales (' . $tenant->legal_form . ')',
                    'severity' => 'critical',
                    'category' => 'legal',
                ];
            }
            if (empty($tenant->rcs_city)) {
                $errors[] = [
                    'field' => 'rcs_city',
                    'message' => 'La ville du greffe RCS est OBLIGATOIRE pour les sociétés commerciales (' . $tenant->legal_form . ')',
                    'severity' => 'critical',
                    'category' => 'legal',
                ];
            }
        }

        // 7. RM (pour les artisans)
        // Les artisans inscrits au Répertoire des Métiers doivent mentionner leur numéro RM
        $artisanForms = ['EI', 'EIRL', 'AUTO'];

        if (in_array(strtoupper($tenant->legal_form ?? ''), $artisanForms)) {
            if (!empty($tenant->rm_number)) {
                // Si RM renseigné, c'est un artisan - tout est OK
            } else {
                // RM non renseigné - avertissement car peut être artisan
                $warnings[] = [
                    'field' => 'rm_number',
                    'message' => 'Si vous êtes artisan, le numéro RM doit être mentionné sur vos factures',
                    'severity' => 'info',
                    'category' => 'legal',
                ];
            }
        }

        // 8. Coordonnées bancaires (obligatoire pour factures électroniques)
        if (empty($tenant->iban)) {
            $errors[] = [
                'field' => 'iban',
                'message' => 'L\'IBAN est obligatoire pour les factures électroniques FacturX',
                'severity' => 'critical',
                'category' => 'payment',
            ];
        }

        // 8. Contact (email recommandé)
        if (empty($tenant->email)) {
            $warnings[] = [
                'field' => 'email',
                'message' => 'L\'email de contact devrait être renseigné',
                'severity' => 'warning',
                'category' => 'contact',
            ];
        }

        $canInvoice = empty($errors);

        if (!$canInvoice) {
            Log::warning('Tenant cannot create invoices - missing mandatory fields', [
                'tenant_id' => $tenant->id,
                'errors_count' => count($errors),
                'errors' => $errors,
            ]);
        }

        return [
            'can_invoice' => $canInvoice,
            'errors' => $errors,
            'warnings' => $warnings,
            'errors_by_category' => $this->groupByCategory($errors),
            'warnings_by_category' => $this->groupByCategory($warnings),
        ];
    }

    /**
     * Vérifie si un client peut recevoir des factures
     *
     * @param Client $client
     * @return array ['can_receive_invoice' => bool, 'errors' => array, 'warnings' => array]
     */
    public function canClientReceiveInvoices(Client $client): array
    {
        $errors = [];
        $warnings = [];

        // === DONNÉES OBLIGATOIRES CLIENT ===

        // 1. Nom du client (obligatoire)
        if (empty($client->name)) {
            $errors[] = [
                'field' => 'name',
                'message' => 'Le nom du client est obligatoire',
                'severity' => 'critical',
                'category' => 'identification',
            ];
        }

        // 2. Adresse complète (OBLIGATOIRE pour conformité EN 16931)
        if (empty($client->address)) {
            $errors[] = [
                'field' => 'address',
                'message' => 'L\'adresse du client est obligatoire (conformité EN 16931 - factures électroniques)',
                'severity' => 'critical',
                'category' => 'address',
            ];
        }

        if (empty($client->postal_code)) {
            $errors[] = [
                'field' => 'postal_code',
                'message' => 'Le code postal du client est obligatoire',
                'severity' => 'critical',
                'category' => 'address',
            ];
        }

        if (empty($client->city)) {
            $errors[] = [
                'field' => 'city',
                'message' => 'La ville du client est obligatoire',
                'severity' => 'critical',
                'category' => 'address',
            ];
        }

        // 3. Email (recommandé pour envoi factures)
        if (empty($client->email)) {
            $warnings[] = [
                'field' => 'email',
                'message' => 'L\'email du client est recommandé pour l\'envoi des factures',
                'severity' => 'warning',
                'category' => 'contact',
            ];
        }

        // 4. Numéro TVA (si client professionnel et assujetti)
        if ($client->is_company && empty($client->vat_number)) {
            $warnings[] = [
                'field' => 'vat_number',
                'message' => 'Le numéro de TVA intracommunautaire est recommandé pour les entreprises',
                'severity' => 'warning',
                'category' => 'vat',
            ];
        }

        $canReceiveInvoice = empty($errors);

        if (!$canReceiveInvoice) {
            Log::warning('Client cannot receive invoices - missing mandatory fields', [
                'client_id' => $client->id,
                'errors_count' => count($errors),
                'errors' => $errors,
            ]);
        }

        return [
            'can_receive_invoice' => $canReceiveInvoice,
            'errors' => $errors,
            'warnings' => $warnings,
            'errors_by_category' => $this->groupByCategory($errors),
            'warnings_by_category' => $this->groupByCategory($warnings),
        ];
    }

    /**
     * Vérifie la conformité complète avant création de facture
     *
     * @param Tenant $tenant
     * @param Client $client
     * @return array
     */
    public function validateInvoiceCreation(Tenant $tenant, Client $client): array
    {
        $tenantValidation = $this->canTenantCreateInvoices($tenant);
        $clientValidation = $this->canClientReceiveInvoices($client);

        $allErrors = array_merge($tenantValidation['errors'], $clientValidation['errors']);
        $allWarnings = array_merge($tenantValidation['warnings'], $clientValidation['warnings']);

        $canCreate = empty($allErrors);

        return [
            'can_create_invoice' => $canCreate,
            'tenant_validation' => $tenantValidation,
            'client_validation' => $clientValidation,
            'all_errors' => $allErrors,
            'all_warnings' => $allWarnings,
            'errors_count' => count($allErrors),
            'warnings_count' => count($allWarnings),
        ];
    }

    /**
     * Génère un message d'erreur formaté pour l'utilisateur
     *
     * @param array $validation Résultat de validateInvoiceCreation
     * @return string
     */
    public function formatValidationMessage(array $validation): string
    {
        if ($validation['can_create_invoice']) {
            return 'Tous les paramètres obligatoires sont renseignés.';
        }

        $message = "❌ Impossible de créer une facture - Paramètres obligatoires manquants:\n\n";

        // Erreurs tenant
        if (!empty($validation['tenant_validation']['errors'])) {
            $message .= "📋 PARAMÈTRES ENTREPRISE:\n";
            foreach ($validation['tenant_validation']['errors'] as $error) {
                $message .= "  • {$error['message']}\n";
            }
            $message .= "\n";
        }

        // Erreurs client
        if (!empty($validation['client_validation']['errors'])) {
            $message .= "👤 PARAMÈTRES CLIENT:\n";
            foreach ($validation['client_validation']['errors'] as $error) {
                $message .= "  • {$error['message']}\n";
            }
            $message .= "\n";
        }

        $message .= "💡 Complétez ces informations avant de créer des factures.";

        return $message;
    }

    /**
     * Regroupe les erreurs par catégorie
     *
     * @param array $items
     * @return array
     */
    private function groupByCategory(array $items): array
    {
        $grouped = [];
        foreach ($items as $item) {
            $category = $item['category'] ?? 'other';
            if (!isset($grouped[$category])) {
                $grouped[$category] = [];
            }
            $grouped[$category][] = $item;
        }
        return $grouped;
    }

    /**
     * Récupère les motifs d'exonération de TVA disponibles
     *
     * @return array
     */
    public function getVatExemptionReasons(): array
    {
        return [
            'article_293b' => 'Article 293 B du CGI - Franchise en base de TVA',
            'auto_entrepreneur' => 'Auto-entrepreneur - Franchise en base de TVA',
            'exempt_article_261' => 'Exonération selon l\'article 261 du CGI',
            'out_of_scope' => 'Activité hors champ d\'application de la TVA',
            'reverse_charge' => 'Autoliquidation de la TVA par le client',
            'export' => 'Exportation hors UE - Exonération de TVA',
            'intra_eu' => 'Livraison intracommunautaire - Exonération de TVA',
        ];
    }

    /**
     * Récupère les types d'entreprise disponibles
     *
     * @return array
     */
    public function getCompanyTypes(): array
    {
        return [
            'EI' => 'Entreprise Individuelle',
            'EIRL' => 'Entreprise Individuelle à Responsabilité Limitée',
            'EURL' => 'Entreprise Unipersonnelle à Responsabilité Limitée',
            'SARL' => 'Société à Responsabilité Limitée',
            'SAS' => 'Société par Actions Simplifiée',
            'SASU' => 'Société par Actions Simplifiée Unipersonnelle',
            'SA' => 'Société Anonyme',
            'SNC' => 'Société en Nom Collectif',
            'SCS' => 'Société en Commandite Simple',
            'SCA' => 'Société en Commandite par Actions',
            'AUTO' => 'Auto-entrepreneur / Micro-entreprise',
            'ASSOCIATION' => 'Association loi 1901',
            'OTHER' => 'Autre',
        ];
    }
}
