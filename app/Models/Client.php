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
        'email',
        'phone',
        'website',
        'address',
        'city',
        'postal_code',
        'country',
        'vat_number',
        'siret',
        'legal_form',
        'is_company',
        'payment_terms',
        'discount_percentage',
        'hourly_rate',
        'currency',
        'notes',
        'is_active',
        'chorus_structure_id',
        'chorus_service_id',
        'chorus_engagement_id',
        'stripe_customer_id',
    ];

    protected $casts = [
        'is_company' => 'boolean',
        'is_active' => 'boolean',
        'payment_terms' => 'integer',
        'discount_percentage' => 'decimal:2',
        'hourly_rate' => 'decimal:2'
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
}