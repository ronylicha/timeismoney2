<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class CreditNote extends Model
{
    use HasFactory, SoftDeletes, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'created_by',
        'client_id',
        'invoice_id',
        'credit_note_number',
        'credit_note_date',
        'applied_date',
        'reason',
        'description',
        'status',
        'subtotal',
        'tax',
        'discount',
        'total',
        'currency',
        'payment_method',
        'notes',
        'compliance_hash',
        'compliance_date',
        'facturx_path',
        'electronic_format',
        'facturx_generated_at',
    ];

    protected $casts = [
        'credit_note_date' => 'date',
        'applied_date' => 'date',
        'compliance_date' => 'datetime',
        'facturx_generated_at' => 'datetime',
        'subtotal' => 'decimal:2',
        'tax' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    protected static function booted()
    {
        static::creating(function (CreditNote $creditNote) {
            if (!$creditNote->created_by && auth()->check()) {
                $creditNote->created_by = auth()->id();
            }

            // Pour les brouillons, attribuer un numéro temporaire
            if (!$creditNote->credit_note_number) {
                if ($creditNote->status === 'draft') {
                    // Numéro temporaire pour brouillon (sera remplacé lors de la validation)
                    $creditNote->credit_note_number = 'DRAFT-CN-' . strtoupper(uniqid());
                } else {
                    $creditNote->credit_note_number = self::generateNumber($creditNote->tenant_id);
                }
            }
        });

        // Générer le vrai numéro quand on passe de draft à un autre statut
        static::updated(function (CreditNote $creditNote) {
            if ($creditNote->isDirty('status')) {
                // Attribuer le vrai numéro quand on passe de draft à un autre statut
                if ($creditNote->getOriginal('status') === 'draft' && $creditNote->status !== 'draft') {
                    $creditNote->credit_note_number = self::generateNumber($creditNote->tenant_id);

                    // Sauvegarder sans déclencher les événements
                    \DB::table('credit_notes')
                        ->where('id', $creditNote->id)
                        ->update([
                            'credit_note_number' => $creditNote->credit_note_number
                        ]);

                    // Générer le hash maintenant si c'est le statut 'issued'
                    if ($creditNote->status === 'issued' && !$creditNote->compliance_hash) {
                        $creditNote->compliance_date = now();
                        $creditNote->compliance_hash = $creditNote->generateComplianceHash();

                        \DB::table('credit_notes')
                            ->where('id', $creditNote->id)
                            ->update([
                                'compliance_date' => $creditNote->compliance_date,
                                'compliance_hash' => $creditNote->compliance_hash
                            ]);
                    }
                }

                // Définir applied_date quand le statut passe à 'applied'
                if ($creditNote->status === 'applied' && !$creditNote->applied_date) {
                    \DB::table('credit_notes')
                        ->where('id', $creditNote->id)
                        ->update([
                            'applied_date' => now()
                        ]);
                }
            }
        });
    }

    /**
     * Get the user who created the credit note
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the tenant that owns the credit note
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the client that owns the credit note
     */
    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * Get the invoice that this credit note is for
     */
    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    /**
     * Get the items for the credit note
     */
    public function items()
    {
        return $this->hasMany(CreditNoteItem::class);
    }

    /**
     * Generate credit note number (format: CN-YYYY-0001)
     */
    public static function generateNumber($tenantId)
    {
        $currentYear = now()->year;
        $yearPrefix = "CN-{$currentYear}-";

        $lastCreditNote = self::where('tenant_id', $tenantId)
            ->where('credit_note_number', 'like', "{$yearPrefix}%")
            ->orderBy('id', 'desc')
            ->first();

        if ($lastCreditNote) {
            // Extract the number part after CN-YYYY-
            $lastNumber = (int)substr($lastCreditNote->credit_note_number, -4);
            $nextNumber = $lastNumber + 1;
        } else {
            $nextNumber = 1;
        }

        return sprintf('CN-%04d-%04d', $currentYear, $nextNumber);
    }

    /**
     * Calculate totals from items
     */
    public function calculateTotals()
    {
        $this->load('items');

        $subtotal = $this->items->sum('total');
        $tax = $this->items->sum('tax_amount');

        $this->subtotal = $subtotal;
        $this->tax = $tax;
        $this->total = $subtotal + $tax - ($this->discount ?? 0);

        $this->save();
    }

    /**
     * Mark credit note as issued
     */
    public function markAsIssued()
    {
        // Changer le statut - l'événement updated gérera le reste
        // (numéro définitif, hash, date de conformité)
        $this->status = 'issued';
        $this->save();
    }

    /**
     * Generate NF525 compliance hash
     */
    protected function generateComplianceHash()
    {
        $data = [
            'credit_note_number' => $this->credit_note_number,
            'credit_note_date' => $this->credit_note_date->format('Y-m-d'),
            'total' => $this->total,
            'client_id' => $this->client_id,
            'timestamp' => now()->timestamp
        ];

        return hash('sha256', json_encode($data));
    }

    /**
     * Scope for status
     */
    public function scopeStatus($query, $status)
    {
        return $query->where('status', $status);
    }
}
