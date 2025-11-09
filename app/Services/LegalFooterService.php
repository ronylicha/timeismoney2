<?php

namespace App\Services;

use App\Models\Tenant;

/**
 * Service de génération automatique des mentions légales
 * conformes à la réglementation française
 */
class LegalFooterService
{
    /**
     * Génère le footer légal pour une facture
     * Conforme à l'Article 441-3 du Code de commerce
     *
     * @param Tenant $tenant
     * @param string $documentType 'invoice' ou 'quote'
     * @return string
     */
    public function generateFooter(Tenant $tenant, string $documentType = 'invoice'): string
    {
        $footer = [];

        // Section 1: Informations légales de l'entreprise
        $footer[] = $this->generateCompanyInfo($tenant);

        // Section 2: Mentions obligatoires selon le type de document
        if ($documentType === 'invoice') {
            $footer[] = $this->generateInvoiceLegalMentions($tenant);
        } else {
            $footer[] = $this->generateQuoteLegalMentions($tenant);
        }

        // Section 3: Conditions de paiement et pénalités
        $footer[] = $this->generatePaymentConditions($tenant, $documentType);

        // Section 4: Mentions spécifiques (TVA, assurance, etc.)
        $footer[] = $this->generateSpecificMentions($tenant);

        // Filtrer les sections vides et joindre avec des séparateurs
        $footer = array_filter($footer);
        return implode("\n\n", $footer);
    }

    /**
     * Informations légales de l'entreprise (obligatoires)
     */
    protected function generateCompanyInfo(Tenant $tenant): string
    {
        $info = [];

        // Nom de l'entreprise et forme juridique
        if ($tenant->company_name && $tenant->legal_form) {
            $info[] = "{$tenant->company_name} - {$tenant->legal_form}";
        } elseif ($tenant->company_name) {
            $info[] = $tenant->company_name;
        }

        // Adresse complète
        $address = $this->formatAddress($tenant);
        if ($address) {
            $info[] = $address;
        }

        // SIRET (obligatoire)
        if ($tenant->siret) {
            $info[] = "SIRET: {$tenant->siret}";
        }

        // RCS (obligatoire pour les sociétés commerciales)
        if ($tenant->rcs_number && $tenant->rcs_city) {
            $info[] = "RCS {$tenant->rcs_city} {$tenant->rcs_number}";
        }

        // Code APE/NAF
        if ($tenant->ape_code) {
            $info[] = "APE: {$tenant->ape_code}";
        }

        // Capital social (obligatoire pour SAS, SARL, SA, etc.)
        if ($tenant->capital && in_array($tenant->legal_form, ['SAS', 'SARL', 'SA', 'SCA', 'SNC'])) {
            $info[] = "Capital social: " . number_format($tenant->capital, 2, ',', ' ') . " €";
        }

        return implode(' • ', $info);
    }

    /**
     * Mentions légales spécifiques aux factures
     */
    protected function generateInvoiceLegalMentions(Tenant $tenant): string
    {
        $mentions = [];

        // Numéro de TVA intracommunautaire
        if ($tenant->vat_subject && $tenant->vat_number) {
            $mentions[] = "N° TVA: {$tenant->vat_number}";
        } elseif (!$tenant->vat_subject && $tenant->vat_exemption_reason) {
            $mentions[] = "TVA non applicable - {$tenant->vat_exemption_reason}";
        }

        // Numéro de téléphone (recommandé)
        if ($tenant->phone) {
            $mentions[] = "Tél: {$tenant->phone}";
        }

        // Email (recommandé)
        if ($tenant->email) {
            $mentions[] = "Email: {$tenant->email}";
        }

        return implode(' • ', $mentions);
    }

    /**
     * Mentions légales spécifiques aux devis
     */
    protected function generateQuoteLegalMentions(Tenant $tenant): string
    {
        $mentions = [];

        // Numéro de TVA
        if ($tenant->vat_subject && $tenant->vat_number) {
            $mentions[] = "N° TVA: {$tenant->vat_number}";
        }

        // Coordonnées de contact
        if ($tenant->phone) {
            $mentions[] = "Tél: {$tenant->phone}";
        }

        if ($tenant->email) {
            $mentions[] = "Email: {$tenant->email}";
        }

        // Validité du devis (mention obligatoire)
        $mentions[] = "Devis gratuit - Valable 30 jours";

        return implode(' • ', $mentions);
    }

    /**
     * Conditions de paiement et pénalités (Article 441-6 Code de commerce)
     */
    protected function generatePaymentConditions(Tenant $tenant, string $documentType): string
    {
        if ($documentType !== 'invoice') {
            return '';
        }

        $conditions = [];

        // Conditions de paiement (obligatoire)
        $conditions[] = "CONDITIONS DE PAIEMENT:";
        
        if ($tenant->default_payment_terms) {
            $conditions[] = "Paiement à {$tenant->default_payment_terms} jours nets.";
        } else {
            $conditions[] = "Paiement à réception de facture.";
        }

        // Pénalités de retard (Article L.441-6 - obligatoire)
        $penaltyRate = 19.59;
        $conditions[] = "En cas de retard de paiement, application de pénalités de retard au taux de {$penaltyRate}% (3 fois le taux d'intérêt légal).";

        // Indemnité forfaitaire de recouvrement (Article D.441-5 - obligatoire)
        $conditions[] = "Indemnité forfaitaire pour frais de recouvrement: 40 € (article D.441-5 du Code de commerce).";

        // Escompte pour paiement anticipé (si applicable)
        if ($tenant->early_payment_discount_rate) {
            $conditions[] = "Escompte pour paiement anticipé: {$tenant->early_payment_discount_rate}%.";
        } else {
            $conditions[] = "Pas d'escompte en cas de paiement anticipé.";
        }

        return implode(' ', $conditions);
    }

    /**
     * Mentions spécifiques selon le statut de l'entreprise
     */
    protected function generateSpecificMentions(Tenant $tenant): string
    {
        $mentions = [];

        // Assurance professionnelle (obligatoire pour certaines professions)
        if ($tenant->insurance_company && $tenant->insurance_policy_number) {
            $mentions[] = "ASSURANCE: {$tenant->insurance_company} - Police N°{$tenant->insurance_policy_number}";
        }

        // Micro-entreprise / Auto-entrepreneur
        if ($tenant->legal_form === 'Micro-entreprise' || $tenant->legal_form === 'Auto-entrepreneur') {
            $mentions[] = "Dispensé d'immatriculation au RCS et au RM";
            if (!$tenant->vat_subject) {
                $mentions[] = "TVA non applicable - Article 293 B du CGI";
            }
        }

        // Profession réglementée
        if ($tenant->professional_order) {
            $mentions[] = "Membre de l'ordre: {$tenant->professional_order}";
        }

        // Site web
        if ($tenant->website) {
            $mentions[] = "Site web: {$tenant->website}";
        }

        return implode(' • ', $mentions);
    }

    /**
     * Génère les mentions légales complètes (footer + conditions)
     */
    public function generateLegalMentions(Tenant $tenant, string $documentType = 'invoice'): string
    {
        $mentions = [];

        // Titre
        $mentions[] = "MENTIONS LÉGALES";
        $mentions[] = str_repeat('─', 80);

        // Pénalités de retard (obligatoire sur facture)
        if ($documentType === 'invoice') {
            $mentions[] = "• Pénalités de retard: 19,59% (3 fois le taux légal en vigueur)";
            $mentions[] = "• Indemnité forfaitaire de recouvrement: 40,00 € (art. D.441-5 Code de commerce)";
            $mentions[] = "• Pas d'escompte pour paiement anticipé sauf mention contraire";
        }

        // Règlement des litiges
        $mentions[] = "• En cas de litige, seuls les tribunaux français sont compétents";
        
        // Protection des données (RGPD)
        $mentions[] = "• Vos données personnelles sont traitées conformément au RGPD";
        
        // Propriété intellectuelle
        if ($documentType === 'quote') {
            $mentions[] = "• Ce devis reste la propriété de {$tenant->company_name} jusqu'à acceptation";
        }

        return implode("\n", $mentions);
    }

    /**
     * Formate l'adresse complète
     */
    protected function formatAddress(Tenant $tenant): ?string
    {
        $parts = array_filter([
            $tenant->address_line1,
            $tenant->address_line2,
            trim(($tenant->postal_code ?? '') . ' ' . ($tenant->city ?? '')),
            $tenant->country !== 'France' ? $tenant->country : null
        ]);

        return !empty($parts) ? implode(', ', $parts) : null;
    }
}
