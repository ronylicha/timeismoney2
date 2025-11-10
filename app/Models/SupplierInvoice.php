<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\BelongsToTenant;

/**
 * Modèle pour les factures fournisseurs reçues via le PDP
 * 
 * @property int $id
 * @property int $tenant_id
 * @property string $invoice_number
 * @property string|null $pdp_reference
 * @property string $uuid
 * @property string $supplier_name
 * @property string|null $supplier_siret
 * @property string|null $supplier_vat_number
 * @property string|null $supplier_address
 * @property string|null $supplier_email
 * @property string|null $supplier_phone
 * @property \Carbon\Carbon $invoice_date
 * @property \Carbon\Carbon $due_date
 * @property \Carbon\Carbon|null $delivery_date
 * @property float $total_ht
 * @property float $total_tva
 * @property float $total_ttc
 * @property string $currency
 * @property array|null $vat_breakdown
 * @property string $status
 * @property string|null $notes
 * @property string|null $rejection_reason
 * @property int|null $validated_by
 * @property int|null $rejected_by
 * @property string $file_path
 * @property string $file_name
 * @property string $file_mime_type
 * @property int $file_size
 * @property string|null $file_hash
 * @property array|null $pdp_metadata
 * @property \Carbon\Carbon|null $pdp_received_at
 * @property \Carbon\Carbon|null $processed_at
 * @property \Carbon\Carbon|null $validated_at
 * @property \Carbon\Carbon|null $rejected_at
 * @property \Carbon\Carbon|null $paid_at
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 */
class SupplierInvoice extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'invoice_number',
        'pdp_reference',
        'uuid',
        'supplier_name',
        'supplier_siret',
        'supplier_vat_number',
        'supplier_address',
        'supplier_email',
        'supplier_phone',
        'invoice_date',
        'due_date',
        'delivery_date',
        'total_ht',
        'total_tva',
        'total_ttc',
        'currency',
        'vat_breakdown',
        'status',
        'notes',
        'rejection_reason',
        'validated_by',
        'rejected_by',
        'file_path',
        'file_name',
        'file_mime_type',
        'file_size',
        'file_hash',
        'pdp_metadata',
        'pdp_received_at',
        'processed_at',
        'validated_at',
        'rejected_at',
        'paid_at',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'due_date' => 'date',
        'delivery_date' => 'date',
        'total_ht' => 'decimal:2',
        'total_tva' => 'decimal:2',
        'total_ttc' => 'decimal:2',
        'vat_breakdown' => 'array',
        'pdp_metadata' => 'array',
        'pdp_received_at' => 'datetime',
        'processed_at' => 'datetime',
        'validated_at' => 'datetime',
        'rejected_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    /**
     * Utilisateur qui a validé la facture
     */
    public function validatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by');
    }

    /**
     * Utilisateur qui a rejeté la facture
     */
    public function rejectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    /**
     * Lignes de facture associées
     */
    public function lines(): HasMany
    {
        return $this->hasMany(SupplierInvoiceLine::class);
    }

    /**
     * Scope pour les factures en attente
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope pour les factures en traitement
     */
    public function scopeProcessing($query)
    {
        return $query->where('status', 'processing');
    }

    /**
     * Scope pour les factures validées
     */
    public function scopeValidated($query)
    {
        return $query->where('status', 'validated');
    }

    /**
     * Scope pour les factures rejetées
     */
    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    /**
     * Scope pour les factures payées
     */
    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    /**
     * Scope pour les factures en retard
     */
    public function scopeOverdue($query)
    {
        return $query->whereIn('status', ['pending', 'validated', 'processing'])
                    ->where('due_date', '<', now());
    }

    /**
     * Vérifie si la facture est en retard
     */
    public function isOverdue(): bool
    {
        return in_array($this->status, ['pending', 'validated', 'processing']) 
               && $this->due_date->isPast();
    }

    /**
     * Vérifie si la facture peut être validée
     */
    public function canBeValidated(): bool
    {
        return in_array($this->status, ['pending', 'processing']);
    }

    /**
     * Vérifie si la facture peut être rejetée
     */
    public function canBeRejected(): bool
    {
        return in_array($this->status, ['pending', 'processing']);
    }

    /**
     * Marque la facture comme en traitement
     */
    public function markAsProcessing(): void
    {
        $this->update([
            'status' => 'processing',
            'processed_at' => now(),
        ]);
    }

    /**
     * Valide la facture
     */
    public function validate(?int $validatedBy = null, ?string $notes = null): void
    {
        $this->update([
            'status' => 'validated',
            'validated_by' => $validatedBy,
            'validated_at' => now(),
            'notes' => $notes,
            'rejection_reason' => null,
        ]);
    }

    /**
     * Rejette la facture
     */
    public function reject(?int $rejectedBy = null, ?string $reason = null): void
    {
        $this->update([
            'status' => 'rejected',
            'rejected_by' => $rejectedBy,
            'rejected_at' => now(),
            'rejection_reason' => $reason,
        ]);
    }

    /**
     * Marque la facture comme payée
     */
    public function markAsPaid(): void
    {
        $this->update([
            'status' => 'paid',
            'paid_at' => now(),
        ]);
    }

    /**
     * Génère un numéro de facture unique
     */
    public static function generateInvoiceNumber(): string
    {
        $prefix = 'FR-';
        $date = now()->format('Ym');
        $sequence = static::where('invoice_number', 'like', $prefix . $date . '%')
                         ->count() + 1;
        
        return $prefix . $date . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Calcule le nombre de jours jusqu'à l'échéance
     */
    public function getDaysUntilDueAttribute(): int
    {
        return now()->diffInDays($this->due_date, false);
    }

    /**
     * Obtient le statut formaté avec badge
     */
    public function getStatusBadgeAttribute(): string
    {
        $badges = [
            'pending' => '<span class="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">En attente</span>',
            'processing' => '<span class="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">En traitement</span>',
            'validated' => '<span class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Validée</span>',
            'rejected' => '<span class="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Rejetée</span>',
            'paid' => '<span class="px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800">Payée</span>',
            'cancelled' => '<span class="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Annulée</span>',
        ];

        return $badges[$this->status] ?? $badges['pending'];
    }
}