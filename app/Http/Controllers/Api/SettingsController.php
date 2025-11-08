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
}
