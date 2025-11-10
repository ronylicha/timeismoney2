<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Configuration Factur-X
    |--------------------------------------------------------------------------
    |
    | Paramètres pour la génération et validation des factures Factur-X
    | Conformité avec la norme EN 16931 et les obligations françaises
    |
    */

    // Profil Factur-X par défaut (BASIC, COMFORT, EXTENDED)
    'default_profile' => env('FACTURX_PROFILE', 'BASIC'),

    // Score de conformité minimum requis (0-100)
    'min_compliance_score' => env('FACTURX_MIN_COMPLIANCE_SCORE', 80),

    // Validation XSD automatique
    'enable_xsd_validation' => env('FACTURX_ENABLE_XSD_VALIDATION', true),

    // Soumission automatique au PDP
    'auto_pdp_submission' => env('FACTURX_AUTO_PDP_SUBMISSION', false),

    // Taille maximale des fichiers (en Mo)
    'max_file_size' => env('FACTURX_MAX_FILE_SIZE', 10),

    // Métadonnées obligatoires
    'required_metadata' => [
        'invoice_number',
        'invoice_date',
        'seller_name',
        'seller_address',
        'buyer_name',
        'buyer_address',
        'total_amount',
        'vat_amount',
    ],

    // Codes TVA français supportés
    'vat_codes' => [
        'S' => 'Standard (20%)',
        'E' => 'Exonéré',
        'Z' => 'TVA à 0%',
        'AE' => 'Autoliquidation',
        'K' => 'TVA sur marge',
    ],

    // Types de documents supportés
    'document_types' => [
        '380' => 'Facture',
        '381' => 'Avoir',
        '389' => 'Note de débit',
    ],

    // Moyens de paiement
    'payment_means' => [
        '30' => 'Virement',
        '31' => 'Chèque',
        '42' => 'Carte bancaire',
        '48' => 'Prélèvement',
        '49' => 'Prélèvement SEPA',
        '57' => 'Mandat SEPA',
        '58' => 'Carte de crédit',
        '59' => 'Prélèvement automatique',
        '97' => 'Autre',
    ],

    // Unités de mesure
    'units' => [
        'C62' => 'Pièce',
        'H87' => 'Heure',
        'DAY' => 'Jour',
        'KGM' => 'Kilogramme',
        'LTR' => 'Litre',
        'MTR' => 'Mètre',
        'MTK' => 'Mètre carré',
        'MTQ' => 'Mètre cube',
        'TNE' => 'Tonne',
    ],

    // Pays supportés (codes ISO)
    'countries' => [
        'FR' => 'France',
        'BE' => 'Belgique',
        'DE' => 'Allemagne',
        'IT' => 'Italie',
        'ES' => 'Espagne',
        'LU' => 'Luxembourg',
        'CH' => 'Suisse',
        'GB' => 'Royaume-Uni',
        'NL' => 'Pays-Bas',
        'AT' => 'Autriche',
    ],

    // Configuration PDF/A-3
    'pdfa3' => [
        'conformance' => 'A', // Niveau de conformité PDF/A
        'version' => '3',    // Version PDF/A
        'icc_profile' => 'sRGB', // Profil couleur
    ],

    // Validation avancée
    'advanced_validation' => [
        'check_vat_numbers' => true,
        'validate_siret' => true,
        'check_iban' => true,
        'validate_dates' => true,
        'check_required_fields' => true,
    ],

    // Logging
    'logging' => [
        'enabled' => true,
        'level' => 'info',
        'include_xml_content' => false, // Attention: peut être volumineux
    ],
];