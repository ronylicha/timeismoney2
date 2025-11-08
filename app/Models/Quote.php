<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Quote extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'client_id',
        'project_id',
        'quote_number',
        'reference',
        'quote_date',
        'valid_until',
        'status',
        'description',
        'items',
        'subtotal',
        'tax_amount',
        'discount_amount',
        'discount_type',
        'total',
        'currency',
        'terms_conditions',
        'notes',
        'internal_notes',
        'sent_at',
        'viewed_at',
        'accepted_at',
        'accepted_by',
        'signature',
        'converted_to_invoice_id',
        'created_by'
    ];

    protected $casts = [
        'quote_date' => 'date',
        'valid_until' => 'date',
        'items' => 'array',
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total' => 'decimal:2',
        'sent_at' => 'datetime',
        'viewed_at' => 'datetime',
        'accepted_at' => 'datetime'
    ];

    /**
     * Get the client for this quote
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * Get the project for this quote
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the invoice this quote was converted to
     */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'converted_to_invoice_id');
    }

    /**
     * Get the user who created this quote
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}