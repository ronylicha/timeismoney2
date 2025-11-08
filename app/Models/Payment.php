<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'invoice_id',
        'user_id',
        'stripe_payment_intent_id',
        'stripe_charge_id',
        'stripe_customer_id',
        'stripe_payment_method',
        'amount',
        'currency',
        'status',
        'payment_type',
        'payment_date',
        'payment_method',
        'reference',
        'description',
        'notes',
        'metadata',
        'failure_message',
        'receipt_url',
        'refunded_amount',
        'refunded_at',
        'paid_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'refunded_amount' => 'decimal:2',
        'payment_date' => 'date',
        'metadata' => 'array',
        'refunded_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    /**
     * Get the tenant for this payment
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the invoice for this payment
     */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    /**
     * Get the user who initiated this payment
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if payment is successful
     */
    public function isSuccessful(): bool
    {
        return $this->status === 'succeeded';
    }

    /**
     * Check if payment is pending
     */
    public function isPending(): bool
    {
        return in_array($this->status, ['pending', 'processing']);
    }

    /**
     * Check if payment has failed
     */
    public function hasFailed(): bool
    {
        return $this->status === 'failed';
    }

    /**
     * Check if payment is refunded
     */
    public function isRefunded(): bool
    {
        return $this->status === 'refunded' || $this->refunded_amount > 0;
    }

    /**
     * Mark payment as succeeded
     */
    public function markAsSucceeded(): void
    {
        $this->update([
            'status' => 'succeeded',
            'paid_at' => now(),
        ]);
    }

    /**
     * Mark payment as failed
     */
    public function markAsFailed(?string $message = null): void
    {
        $this->update([
            'status' => 'failed',
            'failure_message' => $message,
        ]);
    }
}