<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DashboardWidget extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'widget_type',
        'title',
        'settings',
        'position_x',
        'position_y',
        'width',
        'height',
        'is_visible',
        'refresh_interval'
    ];

    protected $casts = [
        'settings' => 'array',
        'position_x' => 'integer',
        'position_y' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
        'is_visible' => 'boolean',
        'refresh_interval' => 'integer'
    ];

    /**
     * Get the user that owns the widget
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}