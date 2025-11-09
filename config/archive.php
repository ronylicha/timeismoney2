<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Archive Storage Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration de l'archivage légal des documents fiscaux
    | Obligation française : conservation 10 ans (LPF Art. L102 B)
    |
    */

    /**
     * Chemin de base pour les archives (relatif à storage/)
     */
    'base_path' => env('ARCHIVE_BASE_PATH', 'archives'),

    /**
     * Disk de stockage principal
     * Options: local, s3, ftp, etc.
     */
    'storage_disk' => env('ARCHIVE_STORAGE_DISK', 'local'),

    /**
     * Durée de rétention légale en années
     * France : 10 ans minimum pour factures
     */
    'retention_years' => env('ARCHIVE_RETENTION_YEARS', 10),

    /**
     * Archivage automatique activé
     */
    'auto_archive_enabled' => env('ARCHIVE_AUTO_ENABLED', true),

    /**
     * Types de documents à archiver automatiquement
     */
    'auto_archive_types' => [
        'invoice' => true,          // Factures
        'credit_note' => true,      // Avoirs
        'quote' => false,           // Devis (optionnel)
        'payment_receipt' => false, // Reçus de paiement (optionnel)
    ],

    /**
     * Formats de document à archiver
     */
    'formats' => [
        'facturx' => [
            'enabled' => true,
            'mime_type' => 'application/pdf',
            'extension' => 'pdf',
        ],
        'pdf' => [
            'enabled' => true,
            'mime_type' => 'application/pdf',
            'extension' => 'pdf',
        ],
        'xml' => [
            'enabled' => true,
            'mime_type' => 'application/xml',
            'extension' => 'xml',
        ],
        'csv' => [
            'enabled' => true,
            'mime_type' => 'text/csv',
            'extension' => 'csv',
        ],
    ],

    /**
     * Configuration de sauvegarde (backup)
     */
    'backup' => [
        'enabled' => env('ARCHIVE_BACKUP_ENABLED', false),
        'disk' => env('ARCHIVE_BACKUP_DISK', 's3'),
        'schedule' => env('ARCHIVE_BACKUP_SCHEDULE', 'weekly'), // daily, weekly, monthly
        'retention_days' => env('ARCHIVE_BACKUP_RETENTION', 365),
    ],

    /**
     * Chiffrement des archives sensibles
     */
    'encryption' => [
        'enabled' => env('ARCHIVE_ENCRYPTION_ENABLED', false),
        'method' => env('ARCHIVE_ENCRYPTION_METHOD', 'AES-256-CBC'),
        'key' => env('ARCHIVE_ENCRYPTION_KEY'),
    ],

    /**
     * Configuration de nettoyage des archives expirées
     */
    'cleanup' => [
        'enabled' => env('ARCHIVE_CLEANUP_ENABLED', false),
        'soft_delete_only' => true, // Toujours true pour conformité légale
        'grace_period_days' => env('ARCHIVE_CLEANUP_GRACE_PERIOD', 90), // Délai supplémentaire après expiration
    ],

    /**
     * Alertes d'expiration
     */
    'alerts' => [
        'enabled' => env('ARCHIVE_ALERTS_ENABLED', true),
        'notify_before_days' => [30, 60, 90], // Alertes à 30, 60, 90 jours avant expiration
        'notification_channels' => ['mail', 'database'],
    ],

    /**
     * Vérification d'intégrité
     */
    'integrity_check' => [
        'enabled' => env('ARCHIVE_INTEGRITY_CHECK_ENABLED', true),
        'schedule' => env('ARCHIVE_INTEGRITY_CHECK_SCHEDULE', 'monthly'),
        'algorithm' => 'sha256', // sha256, sha512, md5
        'auto_repair' => false, // Ne jamais activer en production
    ],

    /**
     * Quotas de stockage par tenant
     */
    'quotas' => [
        'enabled' => env('ARCHIVE_QUOTAS_ENABLED', false),
        'max_size_gb' => env('ARCHIVE_MAX_SIZE_GB', 100),
        'max_files' => env('ARCHIVE_MAX_FILES', 100000),
        'alert_threshold_percent' => 80, // Alerte à 80% du quota
    ],

    /**
     * Compression des archives
     */
    'compression' => [
        'enabled' => env('ARCHIVE_COMPRESSION_ENABLED', false),
        'method' => 'zip', // zip, gzip, bzip2
        'level' => 6, // 1-9
    ],

    /**
     * Journalisation (audit trail)
     */
    'audit' => [
        'log_access' => true,          // Enregistrer chaque accès
        'log_modifications' => true,   // Enregistrer modifications
        'log_deletions' => true,       // Enregistrer suppressions
        'retention_days' => 365 * 10,  // Conserver logs 10 ans
    ],

    /**
     * Métadonnées supplémentaires à capturer
     */
    'metadata' => [
        'capture_ip' => true,
        'capture_user_agent' => true,
        'capture_geolocation' => false,
        'custom_fields' => [],
    ],

    /**
     * Conformité et certifications
     */
    'compliance' => [
        'france' => [
            'loi_anti_fraude_tva' => true,    // Loi anti-fraude TVA 2018
            'nf525_certified' => false,        // Certification NF525
            'facturx_compliant' => true,       // FacturX EN 16931
            'fec_export_enabled' => true,      // Export FEC
        ],
        'gdpr' => [
            'enabled' => true,
            'anonymize_after_years' => 10,
            'allow_deletion_requests' => false, // False pour obligations fiscales
        ],
    ],

    /**
     * Stockage cloud (S3, Azure, GCS)
     */
    'cloud' => [
        's3' => [
            'bucket' => env('ARCHIVE_S3_BUCKET'),
            'region' => env('ARCHIVE_S3_REGION', 'eu-west-3'), // Paris
            'storage_class' => env('ARCHIVE_S3_STORAGE_CLASS', 'STANDARD_IA'), // STANDARD_IA pour archives
            'lifecycle_enabled' => true,
            'transition_to_glacier' => [
                'enabled' => true,
                'after_days' => 365, // Vers Glacier après 1 an
            ],
        ],
        'azure' => [
            'container' => env('ARCHIVE_AZURE_CONTAINER'),
            'tier' => env('ARCHIVE_AZURE_TIER', 'Cool'), // Hot, Cool, Archive
        ],
    ],

    /**
     * Limites de performance
     */
    'limits' => [
        'max_file_size_mb' => env('ARCHIVE_MAX_FILE_SIZE', 50),
        'max_batch_size' => env('ARCHIVE_MAX_BATCH_SIZE', 100),
        'concurrent_uploads' => env('ARCHIVE_CONCURRENT_UPLOADS', 5),
    ],

];
