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
                'vat_regime' => $tenant->vat_regime ?? 'normal',
                'main_activity' => $tenant->main_activity ?? 'general',
                'vat_deduction_coefficient' => $tenant->vat_deduction_coefficient ?? 100,
                'activity_license_number' => $tenant->activity_license_number,
                'vat_exemption_reason' => $tenant->vat_exemption_reason,
                'vat_explanation' => $tenant->getVatExplanation(),
                'business_type' => $tenant->business_type ?? 'services',
                'vat_threshold_services' => $tenant->vat_threshold_services,
                'vat_threshold_goods' => $tenant->vat_threshold_goods,
                'vat_threshold_year_total' => $tenant->vat_threshold_year_total ?? 0,
                'vat_threshold_exceeded_at' => $tenant->vat_threshold_exceeded_at,
                'auto_apply_vat_on_threshold' => $tenant->auto_apply_vat_on_threshold ?? true,
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
                'default_quote_conditions' => $tenant->default_quote_conditions,
                'default_invoice_conditions' => $tenant->default_invoice_conditions,
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
            'vat_regime' => 'nullable|in:franchise_base,normal,intracommunity,export,exempt_article_261,other',
            'main_activity' => 'nullable|in:general,insurance,training,medical,banking,real_estate_rental,education,sports,other_exempt',
            'vat_deduction_coefficient' => 'nullable|numeric|min:0|max:100',
            'activity_license_number' => 'nullable|string|max:100',
            'vat_exemption_reason' => 'nullable|string',
            'business_type' => 'nullable|in:services,goods,mixed',
            'vat_threshold_services' => 'nullable|numeric|min:0',
            'vat_threshold_goods' => 'nullable|numeric|min:0',
            'auto_apply_vat_on_threshold' => 'nullable|boolean',
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
            'default_quote_conditions' => 'nullable|string',
            'default_invoice_conditions' => 'nullable|string',
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
            'vat_regime',
            'main_activity',
            'vat_deduction_coefficient',
            'activity_license_number',
            'vat_exemption_reason',
            'business_type',
            'vat_threshold_services',
            'vat_threshold_goods',
            'auto_apply_vat_on_threshold',
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
            'default_quote_conditions',
            'default_invoice_conditions',
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

    /**
     * Get VAT threshold status for dashboard widget
     */
    public function getVatThresholdStatus(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;

        // Check if tenant has VAT thresholds (franchise_base only)
        if ($tenant->vat_regime !== 'franchise_base') {
            return response()->json([
                'regime' => $tenant->vat_regime,
                'applies' => false,
            ]);
        }

        // Calculate yearly revenue and check threshold
        $yearlyRevenue = $tenant->calculateYearlyRevenue();
        
        // Determine applicable threshold
        $threshold = match($tenant->business_type) {
            'services' => $tenant->vat_threshold_services ?? 36800,
            'goods' => $tenant->vat_threshold_goods ?? 91900,
            'mixed' => min($tenant->vat_threshold_services ?? 36800, $tenant->vat_threshold_goods ?? 91900),
            default => $tenant->vat_threshold_services ?? 36800,
        };

        $percentage = $threshold > 0 ? ($yearlyRevenue / $threshold) * 100 : 0;

        // Get threshold label
        $thresholdLabel = match($tenant->business_type) {
            'services' => 'Prestations de services',
            'goods' => 'Vente de marchandises',
            'mixed' => 'Activité mixte',
            default => 'Prestations de services',
        };

        return response()->json([
            'regime' => $tenant->vat_regime,
            'subject' => $tenant->vat_subject,
            'businessType' => $tenant->business_type ?? 'services',
            'yearlyRevenue' => round($yearlyRevenue, 2),
            'threshold' => $threshold,
            'percentage' => round($percentage, 2),
            'exceededAt' => $tenant->vat_threshold_exceeded_at?->toDateString(),
            'autoApply' => $tenant->auto_apply_vat_on_threshold ?? true,
            'thresholdLabel' => $thresholdLabel,
            'applies' => true,
        ]);
    }
}
