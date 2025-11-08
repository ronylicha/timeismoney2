<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class TenantSettingsController extends Controller
{
    /**
     * Get current tenant billing settings
     */
    public function getBillingSettings(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;

        return response()->json([
            'data' => [
                'company_name' => $tenant->company_name,
                'legal_form' => $tenant->legal_form,
                'siret' => $tenant->siret,
                'rcs_number' => $tenant->rcs_number,
                'rcs_city' => $tenant->rcs_city,
                'capital' => $tenant->capital,
                'ape_code' => $tenant->ape_code,
                'vat_number' => $tenant->vat_number,
                'vat_subject' => $tenant->vat_subject,
                'vat_exemption_reason' => $tenant->vat_exemption_reason,
                'address_line1' => $tenant->address_line1,
                'address_line2' => $tenant->address_line2,
                'postal_code' => $tenant->postal_code,
                'city' => $tenant->city,
                'country' => $tenant->country,
                'email' => $tenant->email,
                'phone' => $tenant->phone,
                'iban' => $tenant->iban,
                'bic' => $tenant->bic,
                'bank_name' => $tenant->bank_name,
                'website' => $tenant->website,
                'logo' => $tenant->logo,
                'late_payment_penalty_text' => $tenant->late_payment_penalty_text,
                'recovery_indemnity_text' => $tenant->recovery_indemnity_text,
                'footer_legal_text' => $tenant->footer_legal_text,
            ],
        ]);
    }

    /**
     * Update tenant billing settings
     */
    public function updateBillingSettings(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;

        $validator = Validator::make($request->all(), [
            'company_name' => 'nullable|string|max:255',
            'legal_form' => 'nullable|string|max:100',
            'siret' => 'nullable|string|max:14',
            'rcs_number' => 'nullable|string|max:50',
            'rcs_city' => 'nullable|string|max:100',
            'capital' => 'nullable|numeric|min:0',
            'ape_code' => 'nullable|string|max:10',
            'vat_number' => 'nullable|string|max:50',
            'vat_subject' => 'nullable|boolean',
            'vat_exemption_reason' => 'nullable|string',
            'address_line1' => 'nullable|string|max:255',
            'address_line2' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:20',
            'city' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'iban' => 'nullable|string|max:34',
            'bic' => 'nullable|string|max:11',
            'bank_name' => 'nullable|string|max:255',
            'website' => 'nullable|url|max:255',
            'late_payment_penalty_text' => 'nullable|string',
            'recovery_indemnity_text' => 'nullable|string',
            'footer_legal_text' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $tenant->update($request->only([
            'company_name',
            'legal_form',
            'siret',
            'rcs_number',
            'rcs_city',
            'capital',
            'ape_code',
            'vat_number',
            'vat_subject',
            'vat_exemption_reason',
            'address_line1',
            'address_line2',
            'postal_code',
            'city',
            'country',
            'email',
            'phone',
            'iban',
            'bic',
            'bank_name',
            'website',
            'late_payment_penalty_text',
            'recovery_indemnity_text',
            'footer_legal_text',
        ]));

        return response()->json([
            'message' => 'Billing settings updated successfully',
            'data' => $tenant->fresh(),
        ]);
    }

    /**
     * Upload tenant logo
     */
    public function uploadLogo(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'logo' => 'required|image|mimes:jpeg,png,jpg,svg|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $tenant = $request->user()->tenant;

        // Delete old logo if exists
        if ($tenant->logo) {
            Storage::disk('public')->delete($tenant->logo);
        }

        $path = $request->file('logo')->store('logos', 'public');

        $tenant->update(['logo' => $path]);

        return response()->json([
            'message' => 'Logo uploaded successfully',
            'data' => [
                'logo' => $path,
                'logo_url' => Storage::url($path),
            ],
        ]);
    }

    /**
     * Delete tenant logo
     */
    public function deleteLogo(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;

        if ($tenant->logo) {
            Storage::disk('public')->delete($tenant->logo);
            $tenant->update(['logo' => null]);
        }

        return response()->json([
            'message' => 'Logo deleted successfully',
        ]);
    }
}
