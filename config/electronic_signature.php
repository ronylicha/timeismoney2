<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Configuration Signature Électronique
    |--------------------------------------------------------------------------
    |
    | Paramètres pour la signature électronique qualifiée des documents Factur-X
    | Conformité eIDAS et réglementation française
    |
    */

    // Activation du service de signature
    'enabled' => env('ELECTRONIC_SIGNATURE_ENABLED', false),

    // Niveau de signature requis
    'signature_level' => env('ELECTRONIC_SIGNATURE_LEVEL', 'QES'), // QES, AES, SES

    // Configuration du certificat de signature
    'certificate' => [
        'path' => env('ELECTRONIC_SIGNATURE_CERT_PATH'),
        'password' => env('ELECTRONIC_SIGNATURE_CERT_PASSWORD'),
        'key_path' => env('ELECTRONIC_SIGNATURE_KEY_PATH'),
        'ca_path' => env('ELECTRONIC_SIGNATURE_CA_PATH'),
        'subject' => [
            'common_name' => env('ELECTRONIC_SIGNATURE_CN'),
            'organization' => env('ELECTRONIC_SIGNATURE_ORG'),
            'organizational_unit' => env('ELECTRONIC_SIGNATURE_OU'),
            'country' => env('ELECTRONIC_SIGNATURE_COUNTRY', 'FR'),
            'email' => env('ELECTRONIC_SIGNATURE_EMAIL'),
        ],
    ],

    // Configuration de l'Autorité de Certification (AC)
    'certificate_authority' => [
        'name' => env('CA_NAME', 'Qualified CA'),
        'url' => env('CA_URL'),
        'api_key' => env('CA_API_KEY'),
        'certificate_chain_path' => env('CA_CHAIN_PATH'),
        'crl_url' => env('CA_CRL_URL'), // Certificate Revocation List
    ],

    // Configuration de l'horodatage qualifié (RFC 3161)
    'timestamp' => [
        'enabled' => env('ELECTRONIC_SIGNATURE_TIMESTAMP_ENABLED', true),
        'url' => env('ELECTRONIC_SIGNATURE_TIMESTAMP_URL'),
        'username' => env('ELECTRONIC_SIGNATURE_TIMESTAMP_USER'),
        'password' => env('ELECTRONIC_SIGNATURE_TIMESTAMP_PASSWORD'),
        'hash_algorithm' => env('ELECTRONIC_SIGNATURE_HASH_ALGO', 'sha256'),
        'require_tsa_certificate' => env('ELECTRONIC_SIGNATURE_REQUIRE_TSA_CERT', true),
    ],

    // Configuration HSM (Hardware Security Module)
    'hsm' => [
        'enabled' => env('HSM_ENABLED', false),
        'provider' => env('HSM_PROVIDER'), // pkcs11, cloudhsm, etc.
        'slot' => env('HSM_SLOT'),
        'pin' => env('HSM_PIN'),
        'library_path' => env('HSM_LIBRARY_PATH'),
    ],

    // Configuration du stockage sécurisé
    'storage' => [
        'certificates_path' => storage_path('app/private/certificates'),
        'keys_path' => storage_path('app/private/keys'),
        'audit_path' => storage_path('app/private/signatures/audit'),
        'temp_path' => storage_path('app/private/signatures/temp'),
        'encryption_key' => env('SIGNATURE_STORAGE_KEY'),
    ],

    // Limites et contraintes
    'limits' => [
        'max_file_size' => env('ELECTRONIC_SIGNATURE_MAX_SIZE', 52428800), // 50MB
        'max_signatures_per_document' => env('ELECTRONIC_SIGNATURE_MAX_SIGS', 5),
        'signature_timeout' => env('ELECTRONIC_SIGNATURE_TIMEOUT', 300), // 5 minutes
        'timestamp_timeout' => env('ELECTRONIC_SIGNATURE_TIMESTAMP_TIMEOUT', 30), // 30 seconds
    ],

    // Validation et vérification
    'validation' => [
        'check_certificate_revocation' => env('ELECTRONIC_SIGNATURE_CHECK_CRL', true),
        'require_trusted_chain' => env('ELECTRONIC_SIGNATURE_REQUIRE_TRUST', true),
        'validate_timestamp' => env('ELECTRONIC_SIGNATURE_VALIDATE_TS', true),
        'check_certificate_expiry' => env('ELECTRONIC_SIGNATURE_CHECK_EXPIRY', true),
        'minimum_key_length' => env('ELECTRONIC_SIGNATURE_MIN_KEY_LENGTH', 2048),
    ],

    // Métadonnées de signature
    'metadata' => [
        'include_location' => env('ELECTRONIC_SIGNATURE_INCLUDE_LOCATION', true),
        'include_reason' => env('ELECTRONIC_SIGNATURE_INCLUDE_REASON', true),
        'include_contact' => env('ELECTRONIC_SIGNATURE_INCLUDE_CONTACT', true),
        'default_reason' => 'Signature électronique de document Factur-X',
        'default_location' => 'France',
    ],

    // Conformité réglementaire
    'compliance' => [
        'eidas_compliant' => env('ELECTRONIC_SIGNATURE_EIDAS', true),
        'qualified_signature' => env('ELECTRONIC_SIGNATURE_QUALIFIED', true),
        'qualified_timestamp' => env('ELECTRONIC_SIGNATURE_QUALIFIED_TS', true),
        'qualified_certificate' => env('ELECTRONIC_SIGNATURE_QUALIFIED_CERT', true),
        'retention_period_years' => env('ELECTRONIC_SIGNATURE_RETENTION', 10),
    ],

    // Audit et logging
    'audit' => [
        'enabled' => env('ELECTRONIC_SIGNATURE_AUDIT_ENABLED', true),
        'log_level' => env('ELECTRONIC_SIGNATURE_LOG_LEVEL', 'info'),
        'include_signer_info' => env('ELECTRONIC_SIGNATURE_AUDIT_SIGNER', true),
        'include_certificate_info' => env('ELECTRONIC_SIGNATURE_AUDIT_CERT', false),
        'include_timestamp_info' => env('ELECTRONIC_SIGNATURE_AUDIT_TS', true),
        'retention_days' => env('ELECTRONIC_SIGNATURE_AUDIT_RETENTION', 3650), // 10 years
    ],

    // Services externes
    'external_services' => [
        'certificate_validation_url' => env('CERT_VALIDATION_URL'),
        'ocsp_url' => env('OCSP_URL'), // Online Certificate Status Protocol
        'crl_distribution_point' => env('CRL_DISTRIBUTION_POINT'),
        'timestamp_authorities' => [
            'primary' => env('TSA_PRIMARY_URL'),
            'backup' => env('TSA_BACKUP_URL'),
        ],
    ],

    // Sécurité
    'security' => [
        'encrypt_private_keys' => env('ELECTRONIC_SIGNATURE_ENCRYPT_KEYS', true),
        'secure_delete_temp' => env('ELECTRONIC_SIGNATURE_SECURE_DELETE', true),
        'require_multi_factor' => env('ELECTRONIC_SIGNATURE_MFA', false),
        'session_timeout' => env('ELECTRONIC_SIGNATURE_SESSION_TIMEOUT', 3600), // 1 hour
        'max_attempts' => env('ELECTRONIC_SIGNATURE_MAX_ATTEMPTS', 3),
    ],

    // Performance
    'performance' => [
        'parallel_validation' => env('ELECTRONIC_SIGNATURE_PARALLEL', true),
        'cache_certificates' => env('ELECTRONIC_SIGNATURE_CACHE_CERTS', true),
        'cache_ttl' => env('ELECTRONIC_SIGNATURE_CACHE_TTL', 3600), // 1 hour
        'batch_size' => env('ELECTRONIC_SIGNATURE_BATCH_SIZE', 10),
    ],

    // Notifications
    'notifications' => [
        'on_signature_success' => env('ELECTRONIC_SIGNATURE_NOTIFY_SUCCESS', true),
        'on_signature_failure' => env('ELECTRONIC_SIGNATURE_NOTIFY_FAILURE', true),
        'on_certificate_expiry' => env('ELECTRONIC_SIGNATURE_NOTIFY_EXPIRY', true),
        'expiry_warning_days' => env('ELECTRONIC_SIGNATURE_EXPIRY_WARNING', 30),
    ],

    // API endpoints
    'api' => [
        'base_url' => env('ELECTRONIC_SIGNATURE_API_URL'),
        'api_key' => env('ELECTRONIC_SIGNATURE_API_KEY'),
        'timeout' => env('ELECTRONIC_SIGNATURE_API_TIMEOUT', 60),
        'retry_attempts' => env('ELECTRONIC_SIGNATURE_API_RETRIES', 3),
    ],

    // Environnement
    'environment' => [
        'mode' => env('ELECTRONIC_SIGNATURE_MODE', 'simulation'), // simulation, staging, production
        'debug' => env('ELECTRONIC_SIGNATURE_DEBUG', false),
        'test_certificates' => env('ELECTRONIC_SIGNATURE_TEST_CERTS', true),
    ],
];