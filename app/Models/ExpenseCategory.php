<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExpenseCategory extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'name',
        'code',
        'description',
        'icon',
        'color',
        'is_active',
        'is_billable_default',
        'is_reimbursable_default',
        'tax_rate',
        'sort_order'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_billable_default' => 'boolean',
        'is_reimbursable_default' => 'boolean',
        'tax_rate' => 'decimal:2',
        'sort_order' => 'integer'
    ];

    /**
     * Get all expenses for this category
     */
    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class, 'category_id');
    }
}