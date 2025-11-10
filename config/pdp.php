<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Portail Public de Facturation (PDP)
    |--------------------------------------------------------------------------
    |
    | Configuration pour l'intégration avec le portail public de facturation
    | de la DGFIP. Obligatoire pour les entreprises soumises à la facturation
    | électronique B2B en France.
    |
    */

    'enabled' => env('PDP_ENABLED', false),

    /*
    |--------------------------------------------------------------------------
    | Mode de fonctionnement
    |--------------------------------------------------------------------------
    |
    | - simulation: Mode de simulation pour tests/développement
    | - production: Mode réel avec API PDP
    |
    */

    'mode' => env('PDP_MODE', 'simulation'),

    /*
    |--------------------------------------------------------------------------
    | URLs PDP
    |--------------------------------------------------------------------------
    |
    | URLs des API du portail public de facturation
    |
    */

    'base_url' => env('PDP_BASE_URL', 'https://sandbox.pdp.dgfip.fr'),
    'oauth_url' => env('PDP_OAUTH_URL', 'https://auth.pdp.dgfip.fr/oauth/token'),
    'api_version' => 'v1',

    /*
    |--------------------------------------------------------------------------
    | OAuth 2.0 Credentials
    |--------------------------------------------------------------------------
    |
    | Identifiants pour l'authentification OAuth 2.0 auprès du PDP
    |
    */

    'client_id' => env('PDP_CLIENT_ID'),
    'client_secret' => env('PDP_CLIENT_SECRET'),
    'scope' => 'invoice_submit invoice_read',

    /*
    |--------------------------------------------------------------------------
    | Timeouts et Retry
    |--------------------------------------------------------------------------
    |
    | Configuration pour la gestion des timeouts et tentatives
    |
    */

    'timeout' => env('PDP_TIMEOUT', 30),
    'retry_attempts' => env('PDP_RETRY_ATTEMPTS', 3),
    'retry_delay' => env('PDP_RETRY_DELAY', 5), // secondes

    /*
    |--------------------------------------------------------------------------
    | Simulation Settings
    |--------------------------------------------------------------------------
    |
    | Configuration spécifique au mode simulation
    |
    */

    'simulation' => [
        'auto_approve' => env('PDP_SIMULATION_AUTO_APPROVE', true),
        'processing_delay' => env('PDP_SIMULATION_DELAY', 30), // secondes
        'error_rate' => env('PDP_SIMULATION_ERROR_RATE', 0), // 0-100%
    ],

    /*
    |--------------------------------------------------------------------------
    | File Settings
    |--------------------------------------------------------------------------
    |
    | Configuration pour les fichiers envoyés au PDP
    |
    */

    'files' => [
        'max_size' => 10 * 1024 * 1024, // 10MB
        'allowed_formats' => ['pdf', 'xml'],
        'storage_path' => 'pdp/submissions',
    ],

    /*
    |--------------------------------------------------------------------------
    | Webhook Settings
    |--------------------------------------------------------------------------
    |
    | Configuration pour recevoir les notifications du PDP
    |
    */

    'webhook' => [
        'enabled' => env('PDP_WEBHOOK_ENABLED', false),
        'url' => env('PDP_WEBHOOK_URL'),
        'secret' => env('PDP_WEBHOOK_SECRET'),
        'events' => ['invoice.submitted', 'invoice.processed', 'invoice.rejected'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Fournisseurs recommandés
    |--------------------------------------------------------------------------
    |
    | Liens vers les fournisseurs de services recommandés pour la PDP
    | et l'horodatage qualifié
    |
    */

    'providers' => [
        'pdp' => [
            'name' => 'SuperPDP',
            'url' => 'https://www.superpdp.tech/',
            'description' => 'Fournisseur PDP recommandé pour la facturation électronique B2B',
        ],
        'timestamp' => [
            'name' => 'OpenAPI',
            'url' => 'https://openapi.com/',
            'description' => 'Fournisseur d\'horodatage qualifié recommandé',
        ],
    ],

];