<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\Tenant;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    /**
     * Get all settings for current user
     */
    public function index()
    {
        $user = auth()->user();

        // Get user settings
        $userSettings = [
            'timezone' => $user->timezone ?? 'UTC',
            'language' => $user->language ?? 'fr',
            'date_format' => $user->date_format ?? 'd/m/Y',
            'time_format' => $user->time_format ?? 'H:i',
            'notifications_enabled' => $user->notifications_enabled ?? true,
            'email_notifications' => $user->email_notifications ?? true,
            'push_notifications' => $user->push_notifications ?? false,
        ];

        // Get tenant settings if user has permission
        $tenantSettings = [];
        if ($user->hasPermission('manage_settings')) {
            $tenant = $user->tenant;
            $tenantSettings = [
                'company_name' => $tenant->name,
                'company_email' => $tenant->email,
                'company_phone' => $tenant->phone,
                'company_address' => $tenant->address,
                'currency' => $tenant->currency ?? 'EUR',
                'tax_rate' => $tenant->tax_rate ?? 20,
                'invoice_prefix' => $tenant->invoice_prefix ?? 'INV',
                'quote_prefix' => $tenant->quote_prefix ?? 'QT',
            ];
        }

        return response()->json([
            'user_settings' => $userSettings,
            'tenant_settings' => $tenantSettings,
        ]);
    }

    /**
     * Update user settings
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'timezone' => 'nullable|string|timezone',
            'language' => 'nullable|in:fr,en',
            'date_format' => 'nullable|string',
            'time_format' => 'nullable|string',
            'notifications_enabled' => 'boolean',
            'email_notifications' => 'boolean',
            'push_notifications' => 'boolean',
        ]);

        $user = auth()->user();
        $user->update($validated);

        return response()->json([
            'message' => 'Settings updated successfully',
            'data' => $user->fresh()
        ]);
    }

    /**
     * Get tenant settings
     */
    public function tenant()
    {
        $user = auth()->user();

        if (!$user->hasPermission('manage_settings')) {
            return response()->json(['message' => 'Insufficient permissions'], 403);
        }

        $tenant = $user->tenant;

        return response()->json([
            'data' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'email' => $tenant->email,
                'phone' => $tenant->phone,
                'address' => $tenant->address,
                'city' => $tenant->city,
                'country' => $tenant->country,
                'postal_code' => $tenant->postal_code,
                'currency' => $tenant->currency ?? 'EUR',
                'tax_rate' => $tenant->tax_rate ?? 20,
                'invoice_prefix' => $tenant->invoice_prefix ?? 'INV',
                'quote_prefix' => $tenant->quote_prefix ?? 'QT',
                'fiscal_year_start' => $tenant->fiscal_year_start,
                'logo_url' => $tenant->logo_url,
                'website' => $tenant->website,
                'siret' => $tenant->siret,
                'vat_number' => $tenant->vat_number,
            ]
        ]);
    }

    /**
     * Update tenant settings
     */
    public function updateTenant(Request $request)
    {
        $user = auth()->user();

        if (!$user->hasPermission('manage_settings')) {
            return response()->json(['message' => 'Insufficient permissions'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'currency' => 'nullable|string|size:3',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'invoice_prefix' => 'nullable|string|max:10',
            'quote_prefix' => 'nullable|string|max:10',
            'fiscal_year_start' => 'nullable|date_format:m-d',
            'website' => 'nullable|url',
            'siret' => 'nullable|string|max:50',
            'vat_number' => 'nullable|string|max:50',
        ]);

        $tenant = $user->tenant;
        $tenant->update($validated);

        return response()->json([
            'message' => 'Tenant settings updated successfully',
            'data' => $tenant->fresh()
        ]);
    }

    /**
     * Get Stripe configuration for current tenant
     */
    public function getStripeSettings()
    {
        $user = auth()->user();

        if (!$user->hasPermission('manage_settings')) {
            return response()->json(['message' => 'Insufficient permissions'], 403);
        }

        $tenant = $user->tenant;

        return response()->json([
            'data' => [
                'stripe_enabled' => $tenant->stripe_enabled,
                'stripe_publishable_key' => $tenant->getStripePublishableKeyForDisplay(),
                'stripe_account_id' => $tenant->stripe_account_id,
                'stripe_connected_at' => $tenant->stripe_connected_at,
                'stripe_configured' => $tenant->hasStripeConfigured(),
                'stripe_functional' => $tenant->testStripeConnection()['success'] ?? false,
                'webhook_url' => route('stripe.webhook'),
                'webhook_instructions' => [
                    'url' => route('stripe.webhook'),
                    'events' => [
                        'payment_intent.succeeded',
                        'payment_intent.payment_failed',
                        'payment_intent.canceled',
                        'charge.refunded',
                        'checkout.session.completed',
                        'checkout.session.expired',
                    ],
                    'description' => 'Configurez cette URL dans votre tableau de bord Stripe (Developers > Webhooks)',
                ],
            ]
        ]);
    }

    /**
     * Update Stripe configuration for current tenant
     */
    public function updateStripeSettings(Request $request)
    {
        $user = auth()->user();

        if (!$user->hasPermission('manage_settings')) {
            return response()->json(['message' => 'Insufficient permissions'], 403);
        }

        $validated = $request->validate([
            'stripe_publishable_key' => 'required|string|starts_with:pk_',
            'stripe_secret_key' => 'required|string|starts_with:sk_',
            'stripe_webhook_secret' => 'nullable|string|starts_with:whsec_',
            'stripe_enabled' => 'boolean',
        ]);

        $tenant = $user->tenant;

        // Validate Stripe keys by attempting a test connection
        try {
            \Stripe\Stripe::setApiKey($validated['stripe_secret_key']);
            \Stripe\Balance::retrieve(); // Test API call

            // Encrypt and store keys - respect user's choice for stripe_enabled
            $tenant->setStripeKeys([
                'stripe_publishable_key' => $validated['stripe_publishable_key'],
                'stripe_secret_key' => $validated['stripe_secret_key'],
                'stripe_webhook_secret' => $validated['stripe_webhook_secret'] ?? null,
                'stripe_enabled' => $validated['stripe_enabled'] ?? false, // Default to false, let user decide
            ]);

            return response()->json([
                'message' => 'Stripe configuration updated successfully',
                'data' => [
                    'stripe_enabled' => $tenant->stripe_enabled,
                    'stripe_configured' => $tenant->hasStripeConfigured(),
                    'stripe_active' => $tenant->isStripeActive(),
                    'stripe_publishable_key_display' => $tenant->getStripePublishableKeyForDisplay(),
                    'stripe_webhook_secret_display' => $tenant->getStripeWebhookSecretForDisplay(),
                    'webhook_url' => route('stripe.webhook'),
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Invalid Stripe API keys',
                'error' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Test Stripe connection for current tenant
     */
    public function testStripeConnection()
    {
        $user = auth()->user();

        if (!$user->hasPermission('manage_settings')) {
            return response()->json(['message' => 'Insufficient permissions'], 403);
        }

        $tenant = $user->tenant;

        if (!$tenant->isStripeActive()) {
            return response()->json([
                'message' => 'Stripe is not active for this tenant',
                'success' => false
            ], 400);
        }

        $result = $tenant->testStripeConnection();

        if ($result['success']) {
            return response()->json([
                'message' => $result['message'],
                'success' => true,
                'data' => [
                    'balance' => $result['balance'] ?? 0,
                    'currency' => $result['currency'] ?? 'eur',
                ]
            ]);
        } else {
            return response()->json([
                'message' => $result['error'] ?? 'Stripe connection failed',
                'success' => false,
                'error' => $result['error'] ?? 'Unknown error'
            ], 422);
        }
    }

    /**
     * Toggle Stripe status for current tenant
     */
    public function toggleStripe(Request $request)
    {
        $user = auth()->user();

        if (!$user->hasPermission('manage_settings')) {
            return response()->json(['message' => 'Insufficient permissions'], 403);
        }

        $validated = $request->validate([
            'stripe_enabled' => 'required|boolean'
        ]);

        $tenant = $user->tenant;
        
        // Only allow enabling if Stripe is configured
        if ($validated['stripe_enabled'] && !$tenant->hasStripeConfigured()) {
            return response()->json([
                'message' => 'Cannot enable Stripe: keys not configured',
                'error' => 'stripe_not_configured'
            ], 422);
        }

        $tenant->update(['stripe_enabled' => $validated['stripe_enabled']]);

        return response()->json([
            'message' => $validated['stripe_enabled'] ? 'Stripe enabled successfully' : 'Stripe disabled successfully',
            'data' => [
                'stripe_enabled' => $tenant->stripe_enabled,
                'stripe_configured' => $tenant->hasStripeConfigured(),
                'stripe_active' => $tenant->isStripeActive(),
            ]
        ]);
    }

    /**
     * Disable Stripe for current tenant (legacy method)
     */
    public function disableStripe()
    {
        $user = auth()->user();

        if (!$user->hasPermission('manage_settings')) {
            return response()->json(['message' => 'Insufficient permissions'], 403);
        }

        $tenant = $user->tenant;
        $tenant->update(['stripe_enabled' => false]);

        return response()->json([
            'message' => 'Stripe disabled successfully',
            'data' => [
                'stripe_enabled' => false,
                'stripe_configured' => $tenant->hasStripeConfigured(),
                'stripe_active' => $tenant->isStripeActive(),
            ]
        ]);
    }

    /**
     * Get PDP configuration for current tenant
     */
    public function getPdpSettings()
    {
        $user = auth()->user();

        if (!$user->hasPermission('manage_settings')) {
            return response()->json(['message' => 'Insufficient permissions'], 403);
        }

        $tenant = $user->tenant;

        return response()->json([
            'data' => [
                'pdp_enabled' => $tenant->pdp_enabled,
                'pdp_mode' => $tenant->pdp_mode,
                'pdp_base_url' => $tenant->pdp_base_url,
                'pdp_oauth_url' => $tenant->pdp_oauth_url,
                'pdp_client_id' => $tenant->pdp_client_id,
                'pdp_scope' => $tenant->pdp_scope,
                'pdp_timeout' => $tenant->pdp_timeout,
                'pdp_retry_attempts' => $tenant->pdp_retry_attempts,
                'pdp_retry_delay' => $tenant->pdp_retry_delay,
                'pdp_simulation_auto_approve' => $tenant->pdp_simulation_auto_approve,
                'pdp_simulation_processing_delay' => $tenant->pdp_simulation_processing_delay,
                'pdp_simulation_error_rate' => $tenant->pdp_simulation_error_rate,
                'pdp_webhook_enabled' => $tenant->pdp_webhook_enabled,
                'pdp_webhook_url' => $tenant->pdp_webhook_url,
                'pdp_notifications_email_enabled' => $tenant->pdp_notifications_email_enabled,
                'pdp_configured' => $tenant->hasPdpConfigured(),
            ]
        ]);
    }

    /**
     * Update PDP configuration for current tenant
     */
    public function updatePdpSettings(Request $request)
    {
        $user = auth()->user();

        if (!$user->hasPermission('manage_settings')) {
            return response()->json(['message' => 'Insufficient permissions'], 403);
        }

        $validated = $request->validate([
            'pdp_enabled' => 'boolean',
            'pdp_mode' => 'required|in:simulation,production',
            'pdp_base_url' => 'required|url',
            'pdp_oauth_url' => 'nullable|url',
            'pdp_client_id' => 'required|string',
            'pdp_client_secret' => 'required|string',
            'pdp_scope' => 'nullable|string',
            'pdp_timeout' => 'nullable|integer|min:1|max:300',
            'pdp_retry_attempts' => 'nullable|integer|min:0|max:10',
            'pdp_retry_delay' => 'nullable|integer|min:1|max:60',
            'pdp_simulation_auto_approve' => 'boolean',
            'pdp_simulation_processing_delay' => 'nullable|integer|min:0|max:300',
            'pdp_simulation_error_rate' => 'nullable|integer|min:0|max:100',
            'pdp_webhook_enabled' => 'boolean',
            'pdp_webhook_url' => 'nullable|url',
            'pdp_webhook_secret' => 'nullable|string',
            'pdp_notifications_email_enabled' => 'boolean',
        ]);

        $tenant = $user->tenant;
        $tenant->update($validated);

        return response()->json([
            'message' => 'PDP configuration updated successfully',
            'data' => [
                'pdp_enabled' => $tenant->pdp_enabled,
                'pdp_configured' => $tenant->hasPdpConfigured(),
            ]
        ]);
    }

    /**
     * Test PDP connection for current tenant
     */
    public function testPdpConnection()
    {
        $user = auth()->user();

        if (!$user->hasPermission('manage_settings')) {
            return response()->json(['message' => 'Insufficient permissions'], 403);
        }

        $tenant = $user->tenant;

        if (!$tenant->hasPdpConfigured()) {
            return response()->json([
                'message' => 'PDP is not configured for this tenant',
                'success' => false
            ], 400);
        }

        try {
            $pdpService = new \App\Services\PdpService($tenant);
            $result = $pdpService->testConnection();

            return response()->json([
                'message' => 'PDP connection successful',
                'success' => true,
                'data' => $result
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'PDP connection failed',
                'success' => false,
                'error' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Disable PDP for current tenant
     */
    public function disablePdp()
    {
        $user = auth()->user();

        if (!$user->hasPermission('manage_settings')) {
            return response()->json(['message' => 'Insufficient permissions'], 403);
        }

        $tenant = $user->tenant;
        $tenant->update(['pdp_enabled' => false]);

        return response()->json([
            'message' => 'PDP disabled successfully',
            'data' => [
                'pdp_enabled' => false
            ]
        ]);
    }

    /**
     * Get Timestamp configuration for current tenant
     */
    public function getTimestampSettings()
    {
        $user = auth()->user();

        if (!$user->hasPermission('manage_settings')) {
            return response()->json(['message' => 'Insufficient permissions'], 403);
        }

        $tenant = $user->tenant;

        return response()->json([
            'data' => [
                'timestamp_enabled' => $tenant->timestamp_enabled,
                'timestamp_provider' => $tenant->timestamp_provider,
                'timestamp_tsa_url' => $tenant->timestamp_tsa_url,
                'timestamp_api_key' => $tenant->timestamp_api_key, // Will be empty in form for security
                'timestamp_certificate_id' => $tenant->timestamp_certificate_id,
                'timestamp_include_certificate' => $tenant->timestamp_include_certificate ?? false,
                'timestamp_use_sandbox' => $tenant->timestamp_use_sandbox ?? true,
                'timestamp_configured' => $tenant->hasTimestampConfigured(),
            ]
        ]);
    }

    /**
     * Update Timestamp configuration for current tenant
     */
    public function updateTimestampSettings(Request $request)
    {
        $user = auth()->user();

        if (!$user->hasPermission('manage_settings')) {
            return response()->json(['message' => 'Insufficient permissions'], 403);
        }

        $validated = $request->validate([
            'timestamp_enabled' => 'boolean',
            'timestamp_provider' => 'required|in:simple,universign,openapi',
            'timestamp_tsa_url' => 'required_if:timestamp_provider,universign,openapi|nullable|url',
            'timestamp_api_key' => 'nullable|string',
            'timestamp_api_secret' => 'nullable|string',
            'timestamp_certificate_id' => 'nullable|string',
            'timestamp_include_certificate' => 'nullable|boolean',
            'timestamp_use_sandbox' => 'nullable|boolean',
        ]);

        $tenant = $user->tenant;

        // Don't overwrite sensitive fields if they are empty (user wants to keep existing value)
        $updateData = $validated;

        if (empty($validated['timestamp_api_key'])) {
            unset($updateData['timestamp_api_key']);
        }

        if (empty($validated['timestamp_api_secret'])) {
            unset($updateData['timestamp_api_secret']);
        }

        $tenant->update($updateData);

        return response()->json([
            'message' => 'Timestamp configuration updated successfully',
            'data' => [
                'timestamp_enabled' => $tenant->timestamp_enabled,
                'timestamp_configured' => $tenant->hasTimestampConfigured(),
            ]
        ]);
    }

    /**
     * Test Timestamp connection for current tenant
     */
    public function testTimestampConnection()
    {
        $user = auth()->user();

        if (!$user->hasPermission('manage_settings')) {
            return response()->json(['message' => 'Insufficient permissions'], 403);
        }

        $tenant = $user->tenant;

        if (!$tenant->hasTimestampConfigured()) {
            return response()->json([
                'message' => 'Timestamp is not configured for this tenant',
                'success' => false
            ], 400);
        }

        try {
            $timestampService = new \App\Services\QualifiedTimestampService($tenant);
            // Test by creating a simple timestamp
            $testModel = new \stdClass();
            $testModel->id = 'test';
            $testModel->test = true;
            
            $timestamp = $timestampService->timestamp($testModel, 'test');
            
            return response()->json([
                'message' => 'Timestamp connection successful',
                'success' => true,
                'data' => [
                    'timestamp_id' => $timestamp->id,
                    'provider' => $timestamp->tsa_provider,
                    'status' => $timestamp->status,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Timestamp connection failed',
                'success' => false,
                'error' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Get invoicing compliance status
     * Check if tenant has all required fields for FacturX generation
     */
    public function getInvoicingComplianceStatus()
    {
        $tenant = auth()->user()->tenant;
        $complianceService = app(\App\Services\InvoicingComplianceService::class);

        // Check only tenant compliance (not client-specific)
        $tenantValidation = $complianceService->canTenantCreateInvoices($tenant);

        // Extract only critical errors (not warnings)
        $criticalErrors = array_filter($tenantValidation['errors'], function($error) {
            return $error['severity'] === 'critical';
        });

        // Format missing fields for frontend
        $missingFields = [];
        foreach ($criticalErrors as $error) {
            $missingFields[$error['field']] = [
                'label' => $this->getFieldLabel($error['field']),
                'description' => $error['message'],
                'location' => 'Paramètres > Facturation'
            ];
        }

        return response()->json([
            'can_create_invoice' => empty($criticalErrors),
            'missing_fields' => $missingFields,
            'warnings' => $tenantValidation['warnings'],
            'validation_message' => empty($criticalErrors)
                ? 'Tous les paramètres de facturation sont configurés'
                : 'Paramètres de facturation incomplets',
        ]);
    }

    /**
     * Get human-readable field label
     */
    private function getFieldLabel(string $field): string
    {
        $labels = [
            'siret' => 'SIRET',
            'vat_number' => 'Numéro de TVA',
            'address_line1' => 'Adresse',
            'city' => 'Ville',
            'postal_code' => 'Code postal',
            'iban' => 'IBAN',
            'capital' => 'Capital social',
            'rcs_number' => 'Numéro RCS',
            'rcs_city' => 'Ville du greffe RCS',
            'legal_form' => 'Forme juridique',
        ];

        return $labels[$field] ?? ucfirst($field);
    }
}
