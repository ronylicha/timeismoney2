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
     * Generate credit note number
     */
    public static function generateNumber($tenantId)
    {
        $lastCreditNote = self::where('tenant_id', $tenantId)
            ->orderBy('id', 'desc')
            ->first();

        $nextNumber = $lastCreditNote ? (int)substr($lastCreditNote->credit_note_number, -4) + 1 : 1;
        return sprintf('CN-%04d', $nextNumber);
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
        $this->status = 'issued';
        $this->compliance_date = now();
        $this->compliance_hash = $this->generateComplianceHash();
        $this->save();
    }

    /**
     * Generate NF525 compliance hash
     */
    private function generateComplianceHash()
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
