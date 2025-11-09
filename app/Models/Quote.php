<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class Quote extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'client_id',
        'project_id',
        'quote_number',
        'sequence_number',
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
        'footer',
        'internal_notes',
        'sent_at',
        'viewed_at',
        'accepted_at',
        'accepted_by',
        'cancelled_at',
        'cancellation_reason',
        'signature',
        'signature_path',
        'signatory_name',
        'signature_ip',
        'signature_user_agent',
        'hash',
        'previous_hash',
        'is_locked',
        'legal_mentions',
        'payment_conditions',
        'conditions',
        'late_payment_penalty_rate',
        'recovery_indemnity',
        'early_payment_discount',
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
        'late_payment_penalty_rate' => 'decimal:2',
        'recovery_indemnity' => 'decimal:2',
        'early_payment_discount' => 'decimal:2',
        'is_locked' => 'boolean',
        'sent_at' => 'datetime',
        'viewed_at' => 'datetime',
        'accepted_at' => 'datetime',
        'cancelled_at' => 'datetime'
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

    /**
     * Get all items for this quote
     */
    public function items(): HasMany
    {
        return $this->hasMany(QuoteItem::class);
    }

    /**
     * Boot the model
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($quote) {
            if (Auth::check() && !$quote->created_by) {
                $quote->created_by = Auth::id();
            }
            
            // Generate sequence number for NF525
            if (!$quote->sequence_number) {
                $quote->sequence_number = $quote->getNextSequentialNumber();
            }
        });
        
        // Generate hash after creation for NF525
        static::created(function ($quote) {
            $quote->generateHash();
        });
        
        // Lock quote when accepted or sent
        static::updated(function ($quote) {
            if ($quote->isDirty('status')) {
                if (in_array($quote->status, ['sent', 'accepted'])) {
                    $quote->is_locked = true;
                    $quote->updateQuietly(['is_locked' => true]);
                }
            }
        });
    }

    /**
     * Get next sequential number for NF525
     */
    protected function getNextSequentialNumber(): int
    {
        $lastQuote = static::where('tenant_id', $this->tenant_id)
            ->orderBy('sequence_number', 'desc')
            ->first();

        return $lastQuote ? ((int)$lastQuote->sequence_number + 1) : 1;
    }

    /**
     * Generate hash for NF525 compliance
     */
    public function generateHash(): void
    {
        $previousQuote = static::where('tenant_id', $this->tenant_id)
            ->where('id', '<', $this->id)
            ->orderBy('id', 'desc')
            ->first();

        $this->previous_hash = $previousQuote?->hash;

        $dataToHash = implode('|', [
            $this->sequence_number,
            $this->quote_number,
            $this->quote_date->format('Y-m-d'),
            $this->total,
            $this->tax_amount,
            $this->client_id,
            $this->previous_hash ?? 'INITIAL'
        ]);

        $this->hash = hash('sha256', $dataToHash);
        $this->signature = hash_hmac('sha256', $dataToHash, config('app.key'));

        DB::table('quotes')
            ->where('id', $this->id)
            ->update([
                'hash' => $this->hash,
                'previous_hash' => $this->previous_hash,
                'signature' => $this->signature
            ]);
    }

    /**
     * Check if quote can be edited
     */
    public function canBeEdited(): bool
    {
        // Un devis peut être édité tant qu'il n'est pas accepté ou verrouillé
        return !$this->is_locked &&
               in_array($this->status, ['draft', 'sent']);
    }
}
