<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modèle pour les lignes de factures fournisseurs
 * 
 * @property int $id
 * @property int $supplier_invoice_id
 * @property string $description
 * @property string|null $product_code
 * @property string|null $product_reference
 * @property float $quantity
 * @property string $unit
 * @property float $unit_price
 * @property float $discount_rate
 * @property float $discount_amount
 * @property float $vat_rate
 * @property float $total_ht
 * @property float $total_tva
 * @property float $total_ttc
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 */
class SupplierInvoiceLine extends Model
{
    protected $fillable = [
        'supplier_invoice_id',
        'description',
        'product_code',
        'product_reference',
        'quantity',
        'unit',
        'unit_price',
        'discount_rate',
        'discount_amount',
        'vat_rate',
        'total_ht',
        'total_tva',
        'total_ttc',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'unit_price' => 'decimal:2',
        'discount_rate' => 'decimal:3',
        'discount_amount' => 'decimal:2',
        'vat_rate' => 'decimal:3',
        'total_ht' => 'decimal:2',
        'total_tva' => 'decimal:2',
        'total_ttc' => 'decimal:2',
    ];

    /**
     * Facture fournisseur associée
     */
    public function supplierInvoice(): BelongsTo
    {
        return $this->belongsTo(SupplierInvoice::class);
    }

    /**
     * Calcule le total HT
     */
    public function calculateTotalHt(): float
    {
        $subtotal = $this->quantity * $this->unit_price;
        $discountAmount = $subtotal * ($this->discount_rate / 100);
        
        return round($subtotal - $discountAmount + $this->discount_amount, 2);
    }

    /**
     * Calcule le montant de TVA
     */
    public function calculateTotalTva(): float
    {
        return round($this->total_ht * ($this->vat_rate / 100), 2);
    }

    /**
     * Calcule le total TTC
     */
    public function calculateTotalTtc(): float
    {
        return round($this->total_ht + $this->total_tva, 2);
    }

    /**
     * Met à jour les montants calculés
     */
    public function updateAmounts(): void
    {
        $this->total_ht = $this->calculateTotalHt();
        $this->total_tva = $this->calculateTotalTva();
        $this->total_ttc = $this->calculateTotalTtc();
        
        $this->save();
    }

    /**
     * Boot du modèle pour calculer automatiquement les montants
     */
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($line) {
            if ($line->isDirty(['quantity', 'unit_price', 'discount_rate', 'discount_amount', 'vat_rate'])) {
                $line->total_ht = $line->calculateTotalHt();
                $line->total_tva = $line->calculateTotalTva();
                $line->total_ttc = $line->calculateTotalTtc();
            }
        });
    }
}