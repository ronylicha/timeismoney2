<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceAuditLog extends Model
{
    use HasFactory;

    public $timestamps = false;
    protected $table = 'invoice_audit_log';

    protected $fillable = [
        'invoice_id',
        'action',
        'signature',
        'timestamp',
        'user_id',
        'ip_address',
        'user_agent',
        'changes'
    ];

    protected $casts = [
        'timestamp' => 'datetime',
        'changes' => 'array'
    ];

    /**
     * Get the invoice for this audit log
     */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    /**
     * Get the user who made the change
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}