<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'type',
        'channel',
        'data',
        'read',
        'read_at',
        'sent_at',
        'status',
        'error',
    ];

    protected $casts = [
        'data' => 'array',
        'read' => 'boolean',
        'read_at' => 'datetime',
        'sent_at' => 'datetime',
    ];

    /**
     * Get the user that received the notification
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(): void
    {
        $this->update([
            'read' => true,
            'read_at' => now(),
        ]);
    }

    /**
     * Scope for unread notifications
     */
    public function scopeUnread($query)
    {
        return $query->where('read', false);
    }

    /**
     * Scope for recent notifications
     */
    public function scopeRecent($query, int $days = 7)
    {
        return $query->where('sent_at', '>=', now()->subDays($days));
    }

    /**
     * Get icon for notification type
     */
    public function getIcon(): string
    {
        $icons = [
            'invoice_created' => 'DocumentTextIcon',
            'invoice_sent' => 'PaperAirplaneIcon',
            'invoice_overdue' => 'ExclamationTriangleIcon',
            'payment_received' => 'CurrencyEuroIcon',
            'task_assigned' => 'UserPlusIcon',
            'task_due_soon' => 'ClockIcon',
            'task_completed' => 'CheckCircleIcon',
            'timer_reminder' => 'ClockIcon',
            'daily_summary' => 'ChartBarIcon',
            'weekly_report' => 'DocumentChartBarIcon',
            'monthly_report' => 'ChartPieIcon',
            'expense_approved' => 'CheckIcon',
            'expense_rejected' => 'XMarkIcon',
            'chorus_pro_update' => 'BuildingLibraryIcon',
            'backup_completed' => 'CloudArrowUpIcon',
            'subscription_expiring' => 'BellAlertIcon',
        ];

        return $icons[$this->type] ?? 'BellIcon';
    }

    /**
     * Get color for notification type
     */
    public function getColor(): string
    {
        $colors = [
            'invoice_created' => 'blue',
            'invoice_sent' => 'green',
            'invoice_overdue' => 'red',
            'payment_received' => 'green',
            'task_assigned' => 'blue',
            'task_due_soon' => 'yellow',
            'task_completed' => 'green',
            'timer_reminder' => 'yellow',
            'expense_rejected' => 'red',
            'chorus_pro_update' => 'purple',
            'subscription_expiring' => 'orange',
        ];

        return $colors[$this->type] ?? 'gray';
    }
}