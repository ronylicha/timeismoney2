<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Stripe API Keys
    |--------------------------------------------------------------------------
    |
    | Your Stripe publishable and secret keys. These can be found in your
    | Stripe dashboard. Use test keys for development and live keys for
    | production.
    |
    */

    'key' => env('STRIPE_KEY'),
    'secret' => env('STRIPE_SECRET'),

    /*
    |--------------------------------------------------------------------------
    | Stripe Webhook Secret
    |--------------------------------------------------------------------------
    |
    | The webhook secret is used to verify that webhook events are sent by
    | Stripe and not by a third party. You can find this in your Stripe
    | dashboard under Developers > Webhooks.
    |
    */

    'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),

    /*
    |--------------------------------------------------------------------------
    | Currency
    |--------------------------------------------------------------------------
    |
    | The default currency to use for Stripe payments. This should match
    | the currency used in your invoices and pricing.
    |
    */

    'currency' => env('STRIPE_CURRENCY', 'EUR'),

    /*
    |--------------------------------------------------------------------------
    | API Version
    |--------------------------------------------------------------------------
    |
    | The Stripe API version to use. Leave null to use the latest version.
    |
    */

    'api_version' => null,

    /*
    |--------------------------------------------------------------------------
    | Payment Methods
    |--------------------------------------------------------------------------
    |
    | The payment methods to enable for Stripe checkout sessions.
    |
    */

    'payment_methods' => [
        'card',
        'sepa_debit',
    ],
];
