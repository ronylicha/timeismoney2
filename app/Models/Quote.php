<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class Quote extends Model
{
    use HasFactory, BelongsToTenant, SoftDeletes;

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
        // 'items' removed - use items() relation instead
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
        'created_by',
        'signature_token',
        'cancellation_reason',
        'signature_data',
        'signer_name',
        'signer_email',
        'signer_position'
    ];

    protected $casts = [
        'quote_date' => 'date',
        'valid_until' => 'date',
        // 'items' removed - use items() relation instead
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
     * Get items attribute - force relation instead of attribute
     * This fixes the issue where $quote->items returns NULL
     */
    public function getItemsAttribute()
    {
        // If relation is loaded, return it
        if ($this->relationLoaded('items')) {
            return $this->getRelation('items');
        }
        
        // Otherwise load and return
        return $this->getRelationValue('items');
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

            // Generate quote number with year and reuse deleted numbers
            if (!$quote->quote_number) {
                $quote->quote_number = $quote->generateQuoteNumber();
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
     * Generate quote number with year - continuité chronologique
     * Format: QT-YYYY-0001
     *
     * Règle : Ne jamais réutiliser un numéro si des devis postérieurs existent
     * pour éviter les incohérences temporelles (red flag fiscal)
     */
    protected function generateQuoteNumber(): string
    {
        $prefix = 'QT';
        // Utiliser l'année de la date du devis
        $year = $this->quote_date ? $this->quote_date->year : now()->year;

        // Vérifier s'il existe des devis actifs pour cette année
        $hasActiveQuotes = static::where('tenant_id', $this->tenant_id)
            ->where('quote_number', 'like', "{$prefix}-{$year}-%")
            ->whereYear('quote_date', $year)
            ->exists();

        // S'il y a des devis actifs, continuer la séquence (pas de réutilisation)
        // Sinon, on peut réutiliser depuis le début
        if ($hasActiveQuotes) {
            // Prendre le max de TOUS les numéros (actifs + supprimés) + 1
            $maxNumber = static::withTrashed()
                ->where('tenant_id', $this->tenant_id)
                ->where('quote_number', 'like', "{$prefix}-{$year}-%")
                ->whereYear('quote_date', $year)
                ->get()
                ->map(function ($quote) {
                    return (int) substr($quote->quote_number, strrpos($quote->quote_number, '-') + 1);
                })
                ->max();

            $nextNumber = $maxNumber ? $maxNumber + 1 : 1;
        } else {
            // Aucun devis actif, on peut réutiliser depuis 0001
            $nextNumber = 1;
        }

        $sequenceStr = str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
        return "{$prefix}-{$year}-{$sequenceStr}";
    }

    /**
     * Get next sequential number - continuité chronologique
     * Même règle : pas de réutilisation si des devis actifs existent
     */
    protected function getNextSequentialNumber(): int
    {
        // Vérifier s'il existe des devis actifs
        $hasActiveQuotes = static::where('tenant_id', $this->tenant_id)->exists();

        if ($hasActiveQuotes) {
            // Continuer après le max (actifs + supprimés)
            $maxSequence = static::withTrashed()
                ->where('tenant_id', $this->tenant_id)
                ->max('sequence_number');

            return $maxSequence ? ((int)$maxSequence + 1) : 1;
        } else {
            // Aucun devis actif, recommencer à 1
            return 1;
        }
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

    /**
     * Generate a unique signature token for public signing
     */
    public function generateSignatureToken(): string
    {
        $token = Str::random(64);
        $this->update(['signature_token' => $token]);
        return $token;
    }

    /**
     * Get the public signature URL
     */
    public function getSignatureUrl(): string
    {
        if (!$this->signature_token) {
            $this->generateSignatureToken();
        }
        return url("/quote/sign/{$this->signature_token}");
    }

    /**
     * Check if quote can be cancelled
     */
    public function canBeCancelled(): bool
    {
        return in_array($this->status, ['draft', 'sent']) && !$this->cancelled_at;
    }

    /**
     * Check if quote can be deleted
     */
    public function canBeDeleted(): bool
    {
        return $this->status === 'draft' && !$this->cancelled_at;
    }

    /**
     * Cancel the quote
     */
    public function cancel(?string $reason = null): void
    {
        if (!$this->canBeCancelled()) {
            throw new \Exception('This quote cannot be cancelled.');
        }

        $this->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancellation_reason' => $reason
        ]);
    }
}
