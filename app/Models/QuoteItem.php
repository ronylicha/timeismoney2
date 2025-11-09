<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuoteItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'quote_id',
        'type',
        'description',
        'long_description',
        'quantity',
        'unit',
        'unit_price',
        'discount_percent',
        'tax_rate',
        'subtotal',
        'tax_amount',
        'total',
        'reference_id',
        'position'
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'discount_percent' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total' => 'decimal:2',
        'position' => 'integer'
    ];

    /**
     * Get the quote that owns the item
     */
    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class);
    }
}
