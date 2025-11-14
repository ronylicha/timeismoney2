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
        'accounting_method',
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
        // PDP settings
        'pdp_enabled',
        'pdp_mode',
        'pdp_base_url',
        'pdp_oauth_url',
        'pdp_client_id',
        'pdp_client_secret',
        'pdp_scope',
        'pdp_timeout',
        'pdp_retry_attempts',
        'pdp_retry_delay',
        'pdp_simulation_auto_approve',
        'pdp_simulation_processing_delay',
        'pdp_simulation_error_rate',
        'pdp_webhook_enabled',
        'pdp_webhook_url',
        'pdp_webhook_secret',
        'pdp_notifications_email_enabled',
        'pdp_connected_at',
        'pdp_connection_error',
        // Timestamp settings
        'timestamp_enabled',
        'timestamp_provider',
        'timestamp_tsa_url',
        'timestamp_api_key',
        'timestamp_api_secret',
        'timestamp_certificate_id',
        'timestamp_include_certificate',
        'timestamp_use_sandbox',
        'timestamp_retry_max_attempts',
        'timestamp_retry_delay_seconds',
        'timestamp_actions',
        'timestamp_connected_at',
        'timestamp_connection_error',
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
        'pdp_enabled' => 'boolean',
        'pdp_connected_at' => 'datetime',
        'pdp_simulation_auto_approve' => 'boolean',
        'pdp_webhook_enabled' => 'boolean',
        'pdp_notifications_email_enabled' => 'boolean',
        'timestamp_enabled' => 'boolean',
        'timestamp_include_certificate' => 'boolean',
        'timestamp_use_sandbox' => 'boolean',
        'timestamp_connected_at' => 'datetime',
        'timestamp_actions' => 'array',
    ];

    protected $hidden = [
        'stripe_secret_key',
        'stripe_webhook_secret',
        'pdp_client_secret',
        'pdp_webhook_secret',
        'timestamp_api_secret',
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
        return !empty($this->stripe_publishable_key) &&
               !empty($this->stripe_secret_key);
    }

    /**
     * Check if Stripe is both configured AND enabled
     */
    public function isStripeActive(): bool
    {
        return $this->stripe_enabled && $this->hasStripeConfigured();
    }

    /**
     * Get Stripe publishable key (decrypted)
     */
    public function getStripePublishableKey(): ?string
    {
        if (!$this->stripe_enabled || empty($this->stripe_publishable_key)) {
            return null;
        }

        return \App\Services\EncryptionService::decrypt($this->stripe_publishable_key);
    }

    /**
     * Get Stripe secret key (decrypted)
     */
    public function getStripeSecretKey(): ?string
    {
        if (empty($this->stripe_secret_key)) {
            return null;
        }

        // Check if key is already encrypted (starts with base64 header)
        if (str_starts_with($this->stripe_secret_key, 'eyJ')) {
            return \App\Services\EncryptionService::decrypt($this->stripe_secret_key);
        }

        // Return plain text key if not encrypted (backward compatibility)
        return $this->stripe_secret_key;
    }

    /**
     * Get Stripe webhook secret (decrypted)
     */
    public function getStripeWebhookSecret(): ?string
    {
        if (!$this->stripe_enabled || empty($this->stripe_webhook_secret)) {
            return null;
        }

        return \App\Services\EncryptionService::decrypt($this->stripe_webhook_secret);
    }

    /**
     * Get Stripe publishable key for display (masked)
     */
    public function getStripePublishableKeyForDisplay(): ?string
    {
        $key = $this->getStripePublishableKey();
        if (!$key) {
            return null;
        }

        return substr($key, 0, 8) . '...' . substr($key, -4);
    }

    /**
     * Get Stripe webhook secret for display (masked)
     */
    public function getStripeWebhookSecretForDisplay(): ?string
    {
        $key = $this->getStripeWebhookSecret();
        if (!$key) {
            return null;
        }

        return substr($key, 0, 10) . '...' . substr($key, -4);
    }

    /**
     * Set Stripe keys with encryption
     */
    public function setStripeKeys(array $keys): void
    {
        $encryptedKeys = \App\Services\EncryptionService::encryptStripeKeys($keys);
        
        $this->update([
            'stripe_publishable_key' => $encryptedKeys['stripe_publishable_key'],
            'stripe_secret_key' => $encryptedKeys['stripe_secret_key'],
            'stripe_webhook_secret' => $encryptedKeys['stripe_webhook_secret'],
            'stripe_enabled' => $keys['stripe_enabled'] ?? true,
            'stripe_connected_at' => $this->stripe_connected_at ?? now(),
        ]);
    }

    /**
     * Test Stripe connection with decrypted keys
     */
    public function testStripeConnection(): array
    {
        if (!$this->hasStripeConfigured()) {
            return [
                'success' => false,
                'error' => 'Stripe is not configured'
            ];
        }

        try {
            $secretKey = $this->getStripeSecretKey();
            if (!$secretKey) {
                return [
                    'success' => false,
                    'error' => 'Secret key could not be decrypted'
                ];
            }

            \Stripe\Stripe::setApiKey($secretKey);
            $balance = \Stripe\Balance::retrieve();

            return [
                'success' => true,
                'message' => 'Stripe connection successful',
                'balance' => $balance->available[0]->amount / 100,
                'currency' => $balance->available[0]->currency,
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Calculate total revenue for current year
     */
    public function calculateYearlyRevenue(): float
    {
        $currentYear = now()->year;

        // Déterminer la méthode comptable (par défaut : cash/encaissement)
        $accountingMethod = $this->accounting_method ?? 'cash';

        if ($accountingMethod === 'accrual') {
            // Comptabilité d'engagement : CA dès l'émission de la facture
            $invoiceRevenue = \App\Models\Invoice::where('tenant_id', $this->id)
                ->whereIn('status', ['sent', 'viewed', 'overdue', 'paid'])
                ->whereYear('date', $currentYear)
                ->sum('subtotal'); // Montant HT

            // Soustraire tous les avoirs émis ou appliqués (peu importe si facture payée)
            $creditNoteTotal = \App\Models\CreditNote::where('tenant_id', $this->id)
                ->whereIn('status', ['issued', 'applied'])
                ->whereYear('credit_note_date', $currentYear)
                ->sum('subtotal'); // Montant HT
        } else {
            // Comptabilité de caisse (encaissement) : CA uniquement sur factures payées
            $invoiceRevenue = \App\Models\Invoice::where('tenant_id', $this->id)
                ->where('status', 'paid')
                ->whereYear('date', $currentYear)
                ->sum('subtotal'); // Montant HT

            // Soustraire UNIQUEMENT les avoirs liés à des factures payées
            $creditNoteTotal = \App\Models\CreditNote::where('tenant_id', $this->id)
                ->whereIn('status', ['issued', 'applied'])
                ->whereYear('credit_note_date', $currentYear)
                ->whereHas('invoice', function ($query) {
                    $query->where('status', 'paid');
                })
                ->sum('subtotal'); // Montant HT
        }

        // Le CA net pour la franchise TVA
        return max(0, $invoiceRevenue - $creditNoteTotal);
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
            // Log error
            \Illuminate\Support\Facades\Log::error('Failed to send VAT threshold alert', [
                'tenant_id' => $this->id,
                'percentage' => $percentage,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Check if PDP is configured for this tenant
     */
    public function hasPdpConfigured(): bool
    {
        return $this->pdp_enabled &&
               !empty($this->pdp_client_id) &&
               !empty($this->pdp_client_secret) &&
               !empty($this->pdp_base_url);
    }

    /**
     * Get PDP base URL
     */
    public function getPdpBaseUrl(): ?string
    {
        return $this->pdp_enabled ? $this->pdp_base_url : null;
    }

    /**
     * Get PDP OAuth URL
     */
    public function getPdpOAuthUrl(): ?string
    {
        return $this->pdp_enabled ? ($this->pdp_oauth_url ?? 'https://auth.pdp.dgfip.fr/oauth/token') : null;
    }

    /**
     * Get PDP client ID
     */
    public function getPdpClientId(): ?string
    {
        return $this->pdp_enabled ? $this->pdp_client_id : null;
    }

    /**
     * Get PDP client secret
     */
    public function getPdpClientSecret(): ?string
    {
        return $this->pdp_enabled ? $this->pdp_client_secret : null;
    }

    /**
     * Get PDP scope
     */
    public function getPdpScope(): string
    {
        return $this->pdp_enabled ? ($this->pdp_scope ?? 'invoice_submit invoice_read') : '';
    }

    /**
     * Get PDP timeout
     */
    public function getPdpTimeout(): int
    {
        return $this->pdp_enabled ? ($this->pdp_timeout ?? 30) : 30;
    }

    /**
     * Get PDP retry attempts
     */
    public function getPdpRetryAttempts(): int
    {
        return $this->pdp_enabled ? ($this->pdp_retry_attempts ?? 3) : 3;
    }

    /**
     * Get PDP retry delay
     */
    public function getPdpRetryDelay(): int
    {
        return $this->pdp_enabled ? ($this->pdp_retry_delay ?? 5) : 5;
    }

    /**
     * Get PDP mode
     */
    public function getPdpMode(): string
    {
        return $this->pdp_enabled ? ($this->pdp_mode ?? 'simulation') : 'simulation';
    }

    /**
     * Get PDP simulation auto approve setting
     */
    public function getPdpSimulationAutoApprove(): bool
    {
        return $this->pdp_enabled ? ($this->pdp_simulation_auto_approve ?? true) : true;
    }

    /**
     * Get PDP simulation processing delay
     */
    public function getPdpSimulationProcessingDelay(): int
    {
        return $this->pdp_enabled ? ($this->pdp_simulation_processing_delay ?? 30) : 30;
    }

    /**
     * Get PDP simulation error rate
     */
    public function getPdpSimulationErrorRate(): int
    {
        return $this->pdp_enabled ? ($this->pdp_simulation_error_rate ?? 0) : 0;
    }

    /**
     * Get PDP webhook URL
     */
    public function getPdpWebhookUrl(): ?string
    {
        return $this->pdp_enabled && $this->pdp_webhook_enabled ? $this->pdp_webhook_url : null;
    }

    /**
     * Get PDP webhook secret
     */
    public function getPdpWebhookSecret(): ?string
    {
        return $this->pdp_enabled && $this->pdp_webhook_enabled ? $this->pdp_webhook_secret : null;
    }

    /**
     * Check if PDP notifications are enabled
     */
    public function isPdpNotificationsEmailEnabled(): bool
    {
        return $this->pdp_enabled ? ($this->pdp_notifications_email_enabled ?? true) : false;
    }

    /**
     * Mark PDP as connected
     */
    public function markPdpAsConnected(): void
    {
        $this->update([
            'pdp_connected_at' => now(),
            'pdp_connection_error' => null,
        ]);
    }

    /**
     * Mark PDP connection error
     */
    public function markPdpConnectionError(string $error): void
    {
        $this->update([
            'pdp_connection_error' => $error,
        ]);
    }

    /**
     * Get all PDP submissions for this tenant
     */
    public function pdpSubmissions(): HasMany
    {
        return $this->hasMany(PdpSubmission::class);
    }

    /**
     * Check if timestamp is configured for this tenant
     */
    public function hasTimestampConfigured(): bool
    {
        return $this->timestamp_enabled &&
               !empty($this->timestamp_provider);
    }

    /**
     * Get timestamp provider
     */
    public function getTimestampProvider(): string
    {
        return $this->timestamp_enabled ? ($this->timestamp_provider ?? 'simple') : 'simple';
    }

    /**
     * Get timestamp TSA URL
     */
    public function getTimestampTsaUrl(): ?string
    {
        return $this->timestamp_enabled ? $this->timestamp_tsa_url : null;
    }

    /**
     * Get timestamp API key
     */
    public function getTimestampApiKey(): ?string
    {
        return $this->timestamp_enabled ? $this->timestamp_api_key : null;
    }

    /**
     * Get timestamp API secret
     */
    public function getTimestampApiSecret(): ?string
    {
        return $this->timestamp_enabled ? $this->timestamp_api_secret : null;
    }

    /**
     * Check if timestamp should use sandbox
     */
    public function getTimestampUseSandbox(): bool
    {
        return $this->timestamp_enabled ? ($this->timestamp_use_sandbox ?? true) : true;
    }

    /**
     * Get timestamp retry max attempts
     */
    public function getTimestampRetryMaxAttempts(): int
    {
        return $this->timestamp_enabled ? ($this->timestamp_retry_max_attempts ?? 3) : 3;
    }

    /**
     * Get timestamp retry delay seconds
     */
    public function getTimestampRetryDelaySeconds(): int
    {
        return $this->timestamp_enabled ? ($this->timestamp_retry_delay_seconds ?? 60) : 60;
    }

    /**
     * Get timestamp actions
     */
    public function getTimestampActions(): array
    {
        if (!$this->timestamp_enabled) {
            return [];
        }

        return $this->timestamp_actions ?? [
            'invoice_validated',
            'invoice_paid',
            'invoice_cancelled',
            'credit_note_created',
        ];
    }

    /**
     * Mark timestamp as connected
     */
    public function markTimestampAsConnected(): void
    {
        $this->update([
            'timestamp_connected_at' => now(),
            'timestamp_connection_error' => null,
        ]);
    }

    /**
     * Mark timestamp connection error
     */
    public function markTimestampConnectionError(string $error): void
    {
        $this->update([
            'timestamp_connection_error' => $error,
        ]);
    }

    /**
     * Get all qualified timestamps for this tenant
     */
    public function qualifiedTimestamps(): HasMany
    {
        return $this->hasMany(QualifiedTimestamp::class);
    }
}