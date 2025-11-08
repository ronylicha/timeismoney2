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
        'type',
        'settings',
        'is_active',
        'logo',
        'primary_color',
        'secondary_color',
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
        'stripe_publishable_key',
        'stripe_secret_key',
        'stripe_webhook_secret',
        'stripe_enabled',
        'stripe_account_id',
        'stripe_settings',
        'stripe_connected_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'settings' => 'array',
        'capital' => 'decimal:2',
        'vat_subject' => 'boolean',
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
}