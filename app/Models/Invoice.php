<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class Invoice extends Model
{
    use HasFactory, SoftDeletes, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'client_id',
        'project_id',
        'invoice_number',
        'sequential_number',
        'date',
        'due_date',
        'status',
        'subtotal',
        'tax_amount',
        'tax_rate',
        'discount_amount',
        'discount_type',
        'total',
        'currency',
        'payment_terms',
        'payment_method',
        'notes',
        'footer',
        'sent_at',
        'viewed_at',
        'payment_date',
        'cancelled_at',
        'cancellation_reason',
        'hash',
        'previous_hash',
        'signature',
        'is_locked',
        'chorus_status',
        'chorus_number',
        'chorus_sent_at',
        'chorus_response',
        'stripe_payment_link',
        'stripe_checkout_session_id',
        'type',
        'advance_percentage',
        'legal_mentions',
        'payment_conditions',
        'late_payment_penalty_rate',
        'recovery_indemnity',
        'early_payment_discount',
    ];

    protected $casts = [
        'date' => 'date',
        'due_date' => 'date',
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total' => 'decimal:2',
        'payment_terms' => 'integer',
        'sent_at' => 'datetime',
        'viewed_at' => 'datetime',
        'payment_date' => 'datetime',
        'cancelled_at' => 'datetime',
        'is_locked' => 'boolean',
        'chorus_sent_at' => 'datetime',
        'chorus_response' => 'array',
        'advance_percentage' => 'decimal:2',
        'late_payment_penalty_rate' => 'decimal:2',
        'recovery_indemnity' => 'decimal:2',
        'early_payment_discount' => 'decimal:2',
    ];

    protected static function booted()
    {
        // Generate invoice number and hash for NF525 compliance
        static::creating(function (Invoice $invoice) {
            if (!$invoice->invoice_number) {
                $invoice->invoice_number = $invoice->generateInvoiceNumber();
            }

            if (!$invoice->sequential_number) {
                $invoice->sequential_number = $invoice->getNextSequentialNumber();
            }
        });

        // Generate hash after creation for NF525
        static::created(function (Invoice $invoice) {
            $invoice->generateHash();
        });

        // Lock invoice and create audit log when paid or sent
        static::updated(function (Invoice $invoice) {
            if ($invoice->isDirty('status')) {
                if (in_array($invoice->status, ['sent', 'paid'])) {
                    $invoice->is_locked = true;
                    $invoice->save();
                }

                // Create audit log entry
                InvoiceAuditLog::create([
                    'invoice_id' => $invoice->id,
                    'action' => $invoice->status,
                    'signature' => $invoice->generateAuditSignature(),
                    'timestamp' => now(),
                    'user_id' => auth()->id(),
                    'ip_address' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                    'changes' => $invoice->getDirty()
                ]);
            }
        });
    }

    /**
     * Get the client that owns the invoice
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * Get the project for this invoice
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get all items for this invoice
     */
    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    /**
     * Get all payments for this invoice
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Get all time entries for this invoice
     */
    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }

    /**
     * Get audit logs for NF525 compliance
     */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(InvoiceAuditLog::class);
    }

    /**
     * Pour une facture de SOLDE: récupérer toutes les factures d'acompte liées
     *
     * Exemple: Facture de solde #100 → Acomptes #50, #51, #52
     */
    public function advances(): BelongsToMany
    {
        return $this->belongsToMany(
            Invoice::class,
            'invoice_advances',
            'final_invoice_id',
            'advance_invoice_id'
        )
        ->withPivot('advance_amount')
        ->withTimestamps()
        ->where('type', 'advance');
    }

    /**
     * Pour une facture d'ACOMPTE: récupérer la facture de solde liée (si existe)
     *
     * Exemple: Acompte #50 → Facture de solde #100
     */
    public function finalInvoice(): BelongsToMany
    {
        return $this->belongsToMany(
            Invoice::class,
            'invoice_advances',
            'advance_invoice_id',
            'final_invoice_id'
        )
        ->withPivot('advance_amount')
        ->withTimestamps()
        ->where('type', 'final');
    }

    /**
     * Calculate total of all advances for this final invoice
     */
    public function getTotalAdvancesAttribute(): float
    {
        if ($this->type !== 'final') {
            return 0;
        }

        return (float) $this->advances()
            ->sum('invoice_advances.advance_amount');
    }

    /**
     * Calculate remaining balance after advances
     */
    public function getRemainingBalanceAttribute(): float
    {
        if ($this->type !== 'final') {
            return (float) $this->total;
        }

        return (float) ($this->total - $this->total_advances);
    }

    /**
     * Check if this advance invoice is already linked to a final invoice
     */
    public function isLinkedToFinalInvoice(): bool
    {
        if ($this->type !== 'advance') {
            return false;
        }

        return $this->finalInvoice()->exists();
    }

    /**
     * Generate unique invoice number
     */
    protected function generateInvoiceNumber(): string
    {
        $prefix = 'INV';
        $year = now()->year;
        $month = str_pad(now()->month, 2, '0', STR_PAD_LEFT);

        $lastInvoice = static::where('tenant_id', $this->tenant_id)
            ->whereYear('date', $year)
            ->whereMonth('date', now()->month)
            ->orderBy('sequential_number', 'desc')
            ->first();

        $sequence = $lastInvoice ? ((int)substr($lastInvoice->sequential_number, -4) + 1) : 1;
        $sequenceStr = str_pad($sequence, 4, '0', STR_PAD_LEFT);

        return "{$prefix}-{$year}{$month}-{$sequenceStr}";
    }

    /**
     * Get next sequential number for NF525
     */
    protected function getNextSequentialNumber(): string
    {
        $lastInvoice = static::where('tenant_id', $this->tenant_id)
            ->orderBy('id', 'desc')
            ->first();

        $nextNumber = $lastInvoice ? ((int)$lastInvoice->sequential_number + 1) : 1;

        return str_pad($nextNumber, 10, '0', STR_PAD_LEFT);
    }

    /**
     * Generate hash for NF525 compliance
     */
    public function generateHash(): void
    {
        $previousInvoice = static::where('tenant_id', $this->tenant_id)
            ->where('id', '<', $this->id)
            ->orderBy('id', 'desc')
            ->first();

        $this->previous_hash = $previousInvoice?->hash;

        $dataToHash = implode('|', [
            $this->sequential_number,
            $this->invoice_number,
            $this->date->format('Y-m-d'),
            $this->total,
            $this->tax_amount,
            $this->client_id,
            $this->previous_hash ?? 'INITIAL'
        ]);

        $this->hash = hash('sha256', $dataToHash);
        $this->signature = hash_hmac('sha256', $dataToHash, config('app.key'));

        DB::table('invoices')
            ->where('id', $this->id)
            ->update([
                'hash' => $this->hash,
                'previous_hash' => $this->previous_hash,
                'signature' => $this->signature
            ]);
    }

    /**
     * Generate audit signature for NF525
     */
    protected function generateAuditSignature(): string
    {
        $data = implode('|', [
            $this->id,
            $this->invoice_number,
            $this->status,
            now()->toIso8601String(),
            auth()->id() ?? 'system',
            request()->ip() ?? 'cli'
        ]);

        return hash_hmac('sha256', $data, config('app.key'));
    }

    /**
     * Get balance due
     */
    public function getBalanceDueAttribute(): float
    {
        return $this->total - $this->payments()->sum('amount');
    }

    /**
     * Check if invoice is overdue
     */
    public function isOverdue(): bool
    {
        return $this->due_date &&
               $this->due_date->isPast() &&
               !in_array($this->status, ['paid', 'cancelled']);
    }

    /**
     * Check if invoice can be edited
     */
    public function canBeEdited(): bool
    {
        return !$this->is_locked &&
               in_array($this->status, ['draft', 'pending']);
    }

    /**
     * Mark as sent
     */
    public function markAsSent(): void
    {
        $this->update([
            'status' => 'sent',
            'sent_at' => now()
        ]);
    }

    /**
     * Mark as paid
     */
    public function markAsPaid(): void
    {
        $this->update([
            'status' => 'paid',
            'paid_at' => now()
        ]);
    }
}