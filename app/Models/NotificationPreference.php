<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationPreference extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'email_enabled',
        'push_enabled',
        'email_daily_summary',
        'email_weekly_summary',
        'notify_task_assigned',
        'notify_task_completed',
        'notify_time_approval_needed',
        'notify_time_approved',
        'notify_invoice_sent',
        'notify_invoice_paid',
        'notify_project_updates',
        'notify_mentions'
    ];

    protected $casts = [
        'email_enabled' => 'boolean',
        'push_enabled' => 'boolean',
        'email_daily_summary' => 'boolean',
        'email_weekly_summary' => 'boolean',
        'notify_task_assigned' => 'boolean',
        'notify_task_completed' => 'boolean',
        'notify_time_approval_needed' => 'boolean',
        'notify_time_approved' => 'boolean',
        'notify_invoice_sent' => 'boolean',
        'notify_invoice_paid' => 'boolean',
        'notify_project_updates' => 'boolean',
        'notify_mentions' => 'boolean'
    ];

    /**
     * Get the user that owns the notification preferences
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}