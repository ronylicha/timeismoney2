<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CreditNoteItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'credit_note_id',
        'description',
        'details',
        'quantity',
        'unit_price',
        'tax_rate',
        'tax_amount',
        'total',
        'position',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total' => 'decimal:2',
        'position' => 'integer',
    ];

    public $timestamps = false;

    /**
     * Get the credit note that owns the item
     */
    public function creditNote()
    {
        return $this->belongsTo(CreditNote::class);
    }

    /**
     * Calculate item total and tax
     */
    public function calculateAmounts()
    {
        $this->total = $this->quantity * $this->unit_price;
        $this->tax_amount = ($this->total * $this->tax_rate) / 100;
    }
}
