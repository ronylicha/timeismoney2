<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TwoFactorAuthentication extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'secret',
        'recovery_codes',
        'enabled',
        'confirmed_at'
    ];

    protected $casts = [
        'enabled' => 'boolean',
        'confirmed_at' => 'datetime'
    ];

    protected $hidden = [
        'secret',
        'recovery_codes'
    ];

    /**
     * Get the user that owns the 2FA settings
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}