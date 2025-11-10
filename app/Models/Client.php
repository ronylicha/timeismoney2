<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Client extends Model
{
    use HasFactory, SoftDeletes, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'code',
        'name',
        'company_name',
        'is_company',
        'legal_form',
        'siret',
        'vat_number',
        'address',
        'address_line1',
        'address_line2',
        'postal_code',
        'city',
        'country',
        'phone',
        'email',
        'website',
        'billing_email',
        'payment_terms',
        'payment_method',
        'discount_percentage',
        'vat_exempt',
        'hourly_rate',
        'currency',
        'status',
        'notes',
        'custom_fields',
        'is_active',
        'created_by',
        'chorus_structure_id',
        'chorus_service_id',
        'chorus_engagement_id',
        'stripe_customer_id',
    ];

    protected $casts = [
        'is_company' => 'boolean',
        'is_active' => 'boolean',
        'vat_exempt' => 'boolean',
        'payment_terms' => 'integer',
        'discount_percentage' => 'decimal:2',
        'hourly_rate' => 'decimal:2',
        'custom_fields' => 'array'
    ];

    /**
     * Get all contacts for this client
     */
    public function contacts(): HasMany
    {
        return $this->hasMany(ClientContact::class);
    }

    /**
     * Get all projects for this client
     */
    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    /**
     * Get all invoices for this client
     */
    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    /**
     * Get all quotes for this client
     */
    public function quotes(): HasMany
    {
        return $this->hasMany(Quote::class);
    }

    /**
     * Get all expenses for this client
     */
    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    /**
     * Get total revenue from this client
     */
    public function getTotalRevenueAttribute(): float
    {
        return $this->invoices()
            ->where('status', 'paid')
            ->sum('total');
    }

    /**
     * Get outstanding amount from this client
     */
    public function getOutstandingAmountAttribute(): float
    {
        return $this->invoices()
            ->whereIn('status', ['sent', 'viewed', 'overdue'])
            ->sum('total');
    }

    /**
     * Get active projects count
     */
    public function getActiveProjectsCountAttribute(): int
    {
        return $this->projects()
            ->where('status', 'active')
            ->count();
    }

    /**
     * Get inactive projects count
     */
    public function getInactiveProjectsCountAttribute(): int
    {
        return $this->projects()
            ->whereIn('status', ['completed', 'archived', 'on_hold', 'cancelled'])
            ->count();
    }
}