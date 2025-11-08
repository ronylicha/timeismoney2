<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientContact extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'client_id',
        'name',
        'email',
        'phone',
        'mobile',
        'position',
        'is_primary',
        'is_billing_contact',
        'notes'
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'is_billing_contact' => 'boolean'
    ];

    /**
     * Get the client that owns the contact
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}