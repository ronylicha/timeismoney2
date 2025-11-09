<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'domain',
        'type',
        'is_active',
        'settings',
        'primary_color',
        'secondary_color',
        // Company information
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
        'vat_deduction_coefficient',
        'main_activity',
        'activity_license_number',
        'vat_exemption_reason',
        'business_type',
        'vat_threshold_services',
        'vat_threshold_goods',
        'vat_threshold_year_total',
        'vat_threshold_exceeded_at',
        'auto_apply_vat_on_threshold',
        'vat_alert_80_sent_at',
        'vat_alert_90_sent_at',
        'vat_alert_100_sent_at',
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
        'logo',
        // Invoice settings
        'last_invoice_number',
        'last_quote_number',
        'last_credit_note_number',
        'invoice_prefix',
        'quote_prefix',
        'credit_note_prefix',
        'late_payment_penalty_text',
        'recovery_indemnity_text',
        'footer_legal_text',
        'default_quote_conditions',
        'default_invoice_conditions',
        // Stripe settings
        'stripe_enabled',
        'stripe_publishable_key',
        'stripe_secret_key',
        'stripe_webhook_secret',
        'stripe_settings',
        'stripe_connected_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'settings' => 'array',
        'capital' => 'decimal:2',
        'vat_subject' => 'boolean',
        'vat_threshold_services' => 'decimal:2',
        'vat_threshold_goods' => 'decimal:2',
        'vat_threshold_year_total' => 'decimal:2',
        'vat_threshold_exceeded_at' => 'date',
        'auto_apply_vat_on_threshold' => 'boolean',
        'vat_alert_80_sent_at' => 'datetime',
        'vat_alert_90_sent_at' => 'datetime',
        'vat_alert_100_sent_at' => 'datetime',
        'stripe_enabled' => 'boolean',
        'stripe_settings' => 'array',
        'stripe_connected_at' => 'datetime',
    ];

    protected $hidden = [
        'stripe_secret_key',
        'stripe_webhook_secret',
    ];

    protected $attributes = [
        'type' => 'company',
        'is_active' => true,
        'primary_color' => '#3B82F6',
        'secondary_color' => '#10B981',
        'country' => 'FR'
    ];

    /**
     * Get all users belonging to this tenant
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get all projects for this tenant
     */
    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    /**
     * Get all clients for this tenant
     */
    public function clients(): HasMany
    {
        return $this->hasMany(Client::class);
    }

    /**
     * Get all invoices for this tenant
     */
    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    /**
     * Get all time entries for this tenant
     */
    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }

    /**
     * Check if tenant is suspended
     */
    public function isSuspended(): bool
    {
        return !$this->is_active;
    }

    /**
     * Get tenant by slug
     */
    public static function findBySlug(string $slug)
    {
        return static::where('slug', $slug)->first();
    }

    /**
     * Check if Stripe is configured for this tenant
     */
    public function hasStripeConfigured(): bool
    {
        return $this->stripe_enabled &&
               !empty($this->stripe_publishable_key) &&
               !empty($this->stripe_secret_key);
    }

    /**
     * Get Stripe publishable key
     */
    public function getStripePublishableKey(): ?string
    {
        return $this->stripe_enabled ? $this->stripe_publishable_key : null;
    }

    /**
     * Get Stripe secret key
     */
    public function getStripeSecretKey(): ?string
    {
        return $this->stripe_enabled ? $this->stripe_secret_key : null;
    }

    /**
     * Get Stripe webhook secret
     */
    public function getStripeWebhookSecret(): ?string
    {
        return $this->stripe_enabled ? $this->stripe_webhook_secret : null;
    }

    /**
     * Calculate total revenue for current year
     */
    public function calculateYearlyRevenue(): float
    {
        $currentYear = now()->year;
        
        return \App\Models\Invoice::where('tenant_id', $this->id)
            ->whereIn('status', ['paid', 'sent'])
            ->whereYear('date', $currentYear)
            ->sum('subtotal'); // Montant HT
    }

    /**
     * Check if VAT thresholds apply to this tenant
     */
    public function hasVatThresholds(): bool
    {
        // Seuls les tenants en "franchise_base" sont soumis aux seuils
        return $this->vat_regime === 'franchise_base';
    }

    /**
     * Check if VAT threshold is exceeded
     */
    public function checkVatThreshold(): bool
    {
        // IMPORTANT: Les seuils ne s'appliquent QUE pour le régime "franchise_base"
        if (!$this->hasVatThresholds()) {
            return false;
        }

        // Si déjà assujetti à la TVA, pas besoin de vérifier
        if ($this->vat_subject) {
            return false;
        }

        // Si pas de seuil configuré, ne pas vérifier
        if (!$this->vat_threshold_services && !$this->vat_threshold_goods) {
            return false;
        }

        // Calculer le CA de l'année
        $yearlyRevenue = $this->calculateYearlyRevenue();
        
        // Mettre à jour le total de l'année
        $this->update(['vat_threshold_year_total' => $yearlyRevenue]);

        // Déterminer le seuil applicable selon le type d'activité
        $threshold = match($this->business_type) {
            'services' => $this->vat_threshold_services ?? 36800,
            'goods' => $this->vat_threshold_goods ?? 91900,
            'mixed' => min($this->vat_threshold_services ?? 36800, $this->vat_threshold_goods ?? 91900), // Le plus restrictif
            default => $this->vat_threshold_services ?? 36800,
        };
        
        if ($yearlyRevenue > $threshold) {
            // Seuil dépassé !
            if (!$this->vat_threshold_exceeded_at) {
                $this->update([
                    'vat_threshold_exceeded_at' => now(),
                ]);

                // Si auto-application activée, passer en assujetti à la TVA
                if ($this->auto_apply_vat_on_threshold) {
                    $this->update([
                        'vat_subject' => true,
                        'vat_exemption_reason' => null,
                    ]);
                }
            }
            return true;
        }

        return false;
    }

    /**
     * Get the applicable tax rate for this tenant
     * Takes into account VAT exemption, threshold, and activity rules
     */
    public function getDefaultTaxRate(): float
    {
        return \App\Services\VatRulesService::getDefaultVatRateForTenant($this);
    }

    /**
     * Get VAT explanation for this tenant
     */
    public function getVatExplanation(): string
    {
        return \App\Services\VatRulesService::getVatExplanation($this);
    }

    /**
     * Check if approaching VAT threshold (90% of threshold)
     */
    public function isApproachingVatThreshold(): bool
    {
        if ($this->vat_subject) {
            return false;
        }

        // Déterminer le seuil applicable selon le type d'activité
        $threshold = match($this->business_type) {
            'services' => $this->vat_threshold_services ?? 36800,
            'goods' => $this->vat_threshold_goods ?? 91900,
            'mixed' => min($this->vat_threshold_services ?? 36800, $this->vat_threshold_goods ?? 91900),
            default => $this->vat_threshold_services ?? 36800,
        };
        
        $yearlyRevenue = $this->vat_threshold_year_total ?? $this->calculateYearlyRevenue();

        return $yearlyRevenue >= ($threshold * 0.9);
    }

    /**
     * Check VAT threshold and send alerts if needed
     * This method should be called after each invoice is created/updated
     */
    public function checkAndSendVatThresholdAlerts(): void
    {
        // Only check for franchise_base regime
        if (!$this->hasVatThresholds() || $this->vat_subject) {
            return;
        }

        // Calculate yearly revenue and percentage
        $yearlyRevenue = $this->calculateYearlyRevenue();
        $threshold = match($this->business_type) {
            'services' => $this->vat_threshold_services ?? 36800,
            'goods' => $this->vat_threshold_goods ?? 91900,
            'mixed' => min($this->vat_threshold_services ?? 36800, $this->vat_threshold_goods ?? 91900),
            default => $this->vat_threshold_services ?? 36800,
        };

        $percentage = $threshold > 0 ? ($yearlyRevenue / $threshold) * 100 : 0;
        $thresholdType = $this->business_type ?? 'services';

        // Update yearly total
        $this->update(['vat_threshold_year_total' => $yearlyRevenue]);

        // Send alerts based on percentage thresholds
        if ($percentage >= 100 && !$this->vat_alert_100_sent_at) {
            // 100% threshold - CRITICAL
            $this->sendVatThresholdAlert(100, $yearlyRevenue, $threshold, $thresholdType);
            $this->update(['vat_alert_100_sent_at' => now()]);
            
            // Also trigger the automatic VAT application if enabled
            if ($this->auto_apply_vat_on_threshold) {
                $this->update([
                    'vat_subject' => true,
                    'vat_exemption_reason' => null,
                    'vat_threshold_exceeded_at' => now(),
                ]);
            }
        } elseif ($percentage >= 90 && !$this->vat_alert_90_sent_at) {
            // 90% threshold - WARNING
            $this->sendVatThresholdAlert(90, $yearlyRevenue, $threshold, $thresholdType);
            $this->update(['vat_alert_90_sent_at' => now()]);
        } elseif ($percentage >= 80 && !$this->vat_alert_80_sent_at) {
            // 80% threshold - INFO
            $this->sendVatThresholdAlert(80, $yearlyRevenue, $threshold, $thresholdType);
            $this->update(['vat_alert_80_sent_at' => now()]);
        }
    }

    /**
     * Send VAT threshold alert email
     */
    private function sendVatThresholdAlert(int $percentage, float $yearlyRevenue, float $threshold, string $thresholdType): void
    {
        if (!$this->email) {
            return;
        }

        try {
            \Illuminate\Support\Facades\Mail::to($this->email)
                ->send(new \App\Mail\VatThresholdAlert(
                    $this,
                    $percentage,
                    $yearlyRevenue,
                    $threshold,
                    $thresholdType
                ));

            // Log the notification
            \App\Models\NotificationLog::create([
                'tenant_id' => $this->id,
                'type' => 'vat_threshold_alert',
                'channel' => 'email',
                'recipient' => $this->email,
                'status' => 'sent',
                'data' => [
                    'percentage' => $percentage,
                    'yearly_revenue' => $yearlyRevenue,
                    'threshold' => $threshold,
                    'threshold_type' => $thresholdType,
                ],
            ]);
        } catch (\Exception $e) {
            // Log the error
            \Illuminate\Support\Facades\Log::error('Failed to send VAT threshold alert', [
                'tenant_id' => $this->id,
                'percentage' => $percentage,
                'error' => $e->getMessage(),
            ]);
        }
    }
}