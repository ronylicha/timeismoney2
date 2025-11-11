<?php

return [

    /*
    |--------------------------------------------------------------------------
    | HSM Mode
    |--------------------------------------------------------------------------
    |
    | Determines which HSM implementation to use:
    | - 'simulator': Development-only simulator (stores keys locally)
    | - 'hardware': Physical HSM device
    | - 'cloud': Cloud-based HSM service
    |
    */
    'mode' => env('HSM_MODE', 'simulator'),

    /*
    |--------------------------------------------------------------------------
    | Hardware HSM Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for physical HSM devices
    |
    */
    'hardware' => [
        'provider' => env('HSM_PROVIDER'),
        'slot' => env('HSM_SLOT'),
        'pin' => env('HSM_PIN'),
        'library_path' => env('HSM_LIBRARY_PATH'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Cloud HSM Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for cloud-based HSM services
    |
    */
    'cloud' => [
        'provider' => env('HSM_CLOUD_PROVIDER'), // aws, azure, gcp
        'key_id' => env('HSM_CLOUD_KEY_ID'),
        'region' => env('HSM_CLOUD_REGION'),
        'access_key' => env('HSM_CLOUD_ACCESS_KEY'),
        'secret_key' => env('HSM_CLOUD_SECRET_KEY'),
    ],

    /*
    |--------------------------------------------------------------------------
    | HSM Simulator Configuration (Development Only)
    |--------------------------------------------------------------------------
    |
    | Configuration for the development HSM simulator
    | WARNING: Never use the simulator in production!
    |
    */
    'simulator' => [
        'storage_path' => env('HSM_SIMULATOR_KEY_STORAGE', 'hsm-simulator'),
        'encryption_key' => env('HSM_SIMULATOR_ENCRYPTION_KEY', env('APP_KEY')),
    ],

    /*
    |--------------------------------------------------------------------------
    | General HSM Settings
    |--------------------------------------------------------------------------
    */
    'default_algorithm' => 'RS256',
    'default_key_size' => 2048,
    'max_keys' => 100,
    'key_rotation_days' => 365,

    /*
    |--------------------------------------------------------------------------
    | Supported Algorithms
    |--------------------------------------------------------------------------
    */
    'algorithms' => [
        'RS256' => ['hash' => 'sha256', 'key_size' => 2048],
        'RS384' => ['hash' => 'sha384', 'key_size' => 3072],
        'RS512' => ['hash' => 'sha512', 'key_size' => 4096],
    ],

];