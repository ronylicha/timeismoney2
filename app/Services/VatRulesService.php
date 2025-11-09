<?php

namespace App\Services;

use App\Models\Tenant;

class VatRulesService
{
    /**
     * Règles de TVA par type d'activité selon le Code Général des Impôts (CGI)
     */
    private const ACTIVITY_VAT_RULES = [
        'general' => [
            'name' => 'Activité générale',
            'exempt' => false,
            'article_cgi' => null,
            'default_rate' => 20.0,
            'description' => 'Commerce, prestations de services classiques',
            'requires_license' => false,
        ],
        'insurance' => [
            'name' => 'Assurances',
            'exempt' => true,
            'article_cgi' => 'Article 261 C CGI',
            'default_rate' => 0.0,
            'description' => 'Opérations d\'assurance, de réassurance et de capitalisation exonérées',
            'requires_license' => false,
            'mixed_activity' => true, // Peut avoir des activités annexes assujetties
        ],
        'training' => [
            'name' => 'Formation professionnelle',
            'exempt' => true,
            'article_cgi' => 'Article 261-4-4° CGI',
            'default_rate' => 0.0,
            'description' => 'Formation professionnelle continue avec numéro d\'agrément',
            'requires_license' => true,
            'license_label' => 'Numéro d\'agrément formation (BPF)',
            'mixed_activity' => true,
        ],
        'medical' => [
            'name' => 'Professions médicales',
            'exempt' => true,
            'article_cgi' => 'Article 261-4-1° CGI',
            'default_rate' => 0.0,
            'description' => 'Soins médicaux et paramédicaux (médecins, infirmiers, kinés...)',
            'requires_license' => false,
        ],
        'banking' => [
            'name' => 'Banques et finances',
            'exempt' => true,
            'article_cgi' => 'Article 261 B CGI',
            'default_rate' => 0.0,
            'description' => 'Opérations bancaires, financières et d\'assurance',
            'requires_license' => false,
            'mixed_activity' => true,
        ],
        'real_estate_rental' => [
            'name' => 'Location immobilière nue',
            'exempt' => true,
            'article_cgi' => 'Article 261 D CGI',
            'default_rate' => 0.0,
            'description' => 'Location d\'immeubles nus à usage d\'habitation ou professionnel',
            'requires_license' => false,
            'note' => 'Option possible pour la TVA sur option (Art. 260-2°)',
        ],
        'education' => [
            'name' => 'Enseignement',
            'exempt' => true,
            'article_cgi' => 'Article 261-4-4° bis CGI',
            'default_rate' => 0.0,
            'description' => 'Enseignement scolaire, universitaire, formation initiale',
            'requires_license' => false,
        ],
        'sports' => [
            'name' => 'Éducation sportive',
            'exempt' => true,
            'article_cgi' => 'Article 261-6° CGI',
            'default_rate' => 0.0,
            'description' => 'Enseignement sportif et éducation physique',
            'requires_license' => false,
        ],
        'other_exempt' => [
            'name' => 'Autre activité exonérée',
            'exempt' => true,
            'article_cgi' => 'À préciser',
            'default_rate' => 0.0,
            'description' => 'Autres activités exonérées de TVA selon CGI',
            'requires_license' => false,
            'mixed_activity' => true,
        ],
    ];

    /**
     * Get VAT rules for a specific activity
     */
    public static function getRulesForActivity(string $activity): array
    {
        return self::ACTIVITY_VAT_RULES[$activity] ?? self::ACTIVITY_VAT_RULES['general'];
    }

    /**
     * Get all available activities
     */
    public static function getAllActivities(): array
    {
        return self::ACTIVITY_VAT_RULES;
    }

    /**
     * Check if an activity is exempt from VAT
     */
    public static function isActivityExempt(string $activity): bool
    {
        $rules = self::getRulesForActivity($activity);
        return $rules['exempt'] ?? false;
    }

    /**
     * Check if an activity can have mixed VAT rates
     */
    public static function canHaveMixedActivity(string $activity): bool
    {
        $rules = self::getRulesForActivity($activity);
        return $rules['mixed_activity'] ?? false;
    }

    /**
     * Check if an activity requires a license number
     */
    public static function requiresLicense(string $activity): bool
    {
        $rules = self::getRulesForActivity($activity);
        return $rules['requires_license'] ?? false;
    }

    /**
     * Get the default VAT rate for a tenant based on all rules
     */
    public static function getDefaultVatRateForTenant(Tenant $tenant): float
    {
        // 1. Vérifier le régime de TVA
        if ($tenant->vat_regime === 'franchise_base') {
            // Franchise en base : vérifier les seuils
            if ($tenant->vat_subject) {
                return 20.0; // Seuil dépassé
            }
            return 0.0; // En franchise
        }

        // 2. Vérifier l'activité principale
        $activityRules = self::getRulesForActivity($tenant->main_activity ?? 'general');
        
        if ($activityRules['exempt']) {
            // Activité exonérée
            if (self::canHaveMixedActivity($tenant->main_activity ?? 'general')) {
                // Activité mixte : retourner 0 par défaut mais permettre 20% sur certaines opérations
                return 0.0;
            }
            return 0.0;
        }

        // 3. Régime normal assujetti
        if ($tenant->vat_subject) {
            return 20.0;
        }

        // 4. Par défaut, selon l'activité
        return $activityRules['default_rate'] ?? 20.0;
    }

    /**
     * Get suggested VAT regime based on legal form and activity
     */
    public static function suggestVatRegime(string $legalForm, string $mainActivity): string
    {
        // Micro-entreprises et auto-entrepreneurs
        if (in_array($legalForm, ['EI', 'EIRL'])) {
            return 'franchise_base';
        }

        // Activités toujours exonérées
        $activityRules = self::getRulesForActivity($mainActivity);
        if ($activityRules['exempt']) {
            return 'normal'; // Exonéré mais pas en franchise (pas de seuils)
        }

        // Sociétés classiques
        if (in_array($legalForm, ['SARL', 'SAS', 'SA', 'EURL'])) {
            return 'normal';
        }

        return 'normal';
    }

    /**
     * Get explanation text for VAT status
     */
    public static function getVatExplanation(Tenant $tenant): string
    {
        $activityRules = self::getRulesForActivity($tenant->main_activity ?? 'general');

        if ($tenant->vat_regime === 'franchise_base') {
            if ($tenant->vat_subject) {
                return "Votre CA a dépassé le seuil de franchise en base. Vous êtes maintenant assujetti à la TVA à 20%.";
            }
            return "Vous bénéficiez du régime de franchise en base de TVA. Vos factures sont à 0% tant que vous ne dépassez pas le seuil.";
        }

        if ($activityRules['exempt']) {
            $explanation = "Votre activité ({$activityRules['name']}) est exonérée de TVA selon {$activityRules['article_cgi']}.";
            
            if (self::canHaveMixedActivity($tenant->main_activity ?? 'general')) {
                $explanation .= " Attention : les activités annexes en dehors de votre activité principale peuvent être assujetties à la TVA à 20%.";
            }
            
            return $explanation;
        }

        if ($tenant->vat_subject) {
            return "Vous êtes assujetti à la TVA. Vos factures sont au taux normal de 20%.";
        }

        return "Votre régime de TVA est configuré en mode normal.";
    }
}
