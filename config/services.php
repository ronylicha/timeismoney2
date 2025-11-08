<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Chorus Pro Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for the French government B2G invoicing platform
    |
    */
    'chorus_pro' => [
        'production' => env('CHORUS_PRO_PRODUCTION', false),
        'technical_username' => env('CHORUS_PRO_USERNAME'),
        'technical_password' => env('CHORUS_PRO_PASSWORD'),
        'certificate_path' => env('CHORUS_PRO_CERT_PATH', storage_path('app/certificates/chorus_pro.pem')),
        'certificate_password' => env('CHORUS_PRO_CERT_PASSWORD'),
        'private_key_path' => env('CHORUS_PRO_KEY_PATH', storage_path('app/certificates/chorus_pro.key')),
    ],

    /*
    |--------------------------------------------------------------------------
    | Payment Gateways
    |--------------------------------------------------------------------------
    */
    'stripe' => [
        'key' => env('STRIPE_KEY'),
        'secret' => env('STRIPE_SECRET'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
    ],

    'paypal' => [
        'client_id' => env('PAYPAL_CLIENT_ID'),
        'secret' => env('PAYPAL_SECRET'),
        'mode' => env('PAYPAL_MODE', 'sandbox'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Push Notifications
    |--------------------------------------------------------------------------
    */
    'vapid' => [
        'public_key' => env('VAPID_PUBLIC_KEY'),
        'private_key' => env('VAPID_PRIVATE_KEY'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Google OAuth & Calendar
    |--------------------------------------------------------------------------
    */
    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', env('APP_URL') . '/api/auth/google/callback'),
    ],

];
