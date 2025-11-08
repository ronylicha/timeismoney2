<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subscription extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'plan_name',
        'plan_type',
        'billing_cycle',
        'price',
        'currency',
        'user_limit',
        'project_limit',
        'client_limit',
        'has_api_access',
        'has_advanced_reports',
        'has_white_label',
        'has_custom_domain',
        'storage_limit_gb',
        'start_date',
        'end_date',
        'next_billing_date',
        'status',
        'stripe_subscription_id',
        'stripe_customer_id',
        'trial_days',
        'trial_ends_at',
        'cancelled_at',
        'cancellation_reason'
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'user_limit' => 'integer',
        'project_limit' => 'integer',
        'client_limit' => 'integer',
        'has_api_access' => 'boolean',
        'has_advanced_reports' => 'boolean',
        'has_white_label' => 'boolean',
        'has_custom_domain' => 'boolean',
        'storage_limit_gb' => 'integer',
        'start_date' => 'date',
        'end_date' => 'date',
        'next_billing_date' => 'date',
        'trial_days' => 'integer',
        'trial_ends_at' => 'date',
        'cancelled_at' => 'datetime'
    ];

    /**
     * Get the tenant that owns the subscription
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}