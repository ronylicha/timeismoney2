<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Timestamp Provider
    |--------------------------------------------------------------------------
    |
    | Provider d'horodatage qualifié à utiliser:
    |
    | - 'simple' : Horodatage serveur uniquement (gratuit, non qualifié)
    | - 'universign' : Universign API (payant, qualifié eIDAS)
    | - 'chambersign' : ChamberSign CCI France (payant, qualifié)
    | - 'certeurope' : Certeurope La Poste (payant, qualifié)
    |
    */

    'provider' => env('TIMESTAMP_PROVIDER', 'simple'),

    /*
    |--------------------------------------------------------------------------
    | TSA URL
    |--------------------------------------------------------------------------
    |
    | URL de l'Autorité de Confiance (Time Stamp Authority)
    | Dépend du provider choisi.
    |
    */

    'tsa_url' => env('TIMESTAMP_TSA_URL', null),

    /*
    |--------------------------------------------------------------------------
    | API Credentials
    |--------------------------------------------------------------------------
    |
    | Credentials d'authentification pour l'API du provider.
    | Nécessaire pour les providers payants.
    |
    */

    'api_key' => env('TIMESTAMP_API_KEY', null),
    'api_secret' => env('TIMESTAMP_API_SECRET', null),

    /*
    |--------------------------------------------------------------------------
    | Enabled
    |--------------------------------------------------------------------------
    |
    | Activer/désactiver l'horodatage qualifié.
    | Si désactivé, aucun timestamp ne sera créé.
    |
    */

    'enabled' => env('TIMESTAMP_ENABLED', true),

    /*
    |--------------------------------------------------------------------------
    | Actions à horodater
    |--------------------------------------------------------------------------
    |
    | Liste des actions qui déclenchent un horodatage qualifié.
    | Commenter celles qui ne sont pas nécessaires pour votre usage.
    |
    */

    'actions' => [
        'invoice_validated',   // Facture validée (obligatoire NF525)
        'invoice_paid',        // Paiement reçu (obligatoire NF525)
        'invoice_cancelled',   // Annulation (obligatoire NF525)
        'credit_note_created', // Avoir créé (obligatoire NF525)
        // 'quote_accepted',      // Devis accepté (optionnel)
        // 'payment_received',    // Paiement encaissé (optionnel)
    ],

    /*
    |--------------------------------------------------------------------------
    | Retry Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration des tentatives en cas d'échec TSA.
    |
    */

    'retry' => [
        'max_attempts' => 3,
        'delay_seconds' => 60, // Délai entre 2 tentatives
    ],

    /*
    |--------------------------------------------------------------------------
    | Providers Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration spécifique par provider.
    |
    */

    'providers' => [
        'universign' => [
            'url' => 'https://api.universign.com/v1/timestamp',
            'sandbox_url' => 'https://sandbox-api.universign.com/v1/timestamp',
            'use_sandbox' => env('TIMESTAMP_SANDBOX', false),
        ],

        'chambersign' => [
            'url' => 'https://timestamp.chambersign.fr',
            'contact' => 'contact@chambersign.fr',
            'phone' => '01 55 65 75 70',
        ],

        'certeurope' => [
            'url' => 'https://timestamp.certeurope.fr',
            'contact' => 'contact@certeurope.fr',
            'phone' => '01 71 25 00 00',
        ],

        'openapi' => [
            'url' => 'https://openapi.com/',
            'name' => 'OpenAPI',
            'description' => 'Fournisseur d\'horodatage qualifié recommandé',
        ],
    ],

];
