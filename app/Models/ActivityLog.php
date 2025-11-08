<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'tenant_id',
        'type',
        'description',
        'properties',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'properties' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Activity types
     */
    const TYPES = [
        // Authentication
        'user_login' => 'User Login',
        'user_logout' => 'User Logout',
        'user_2fa_enabled' => '2FA Enabled',
        'user_2fa_disabled' => '2FA Disabled',
        'password_changed' => 'Password Changed',
        'password_reset' => 'Password Reset',

        // User Management
        'user_created' => 'User Created',
        'user_updated' => 'User Updated',
        'user_deleted' => 'User Deleted',
        'user_suspended' => 'User Suspended',
        'user_activated' => 'User Activated',
        'user_impersonated' => 'User Impersonated',

        // Tenant Management
        'tenant_created' => 'Tenant Created',
        'tenant_updated' => 'Tenant Updated',
        'tenant_deleted' => 'Tenant Deleted',
        'tenant_suspended' => 'Tenant Suspended',
        'tenant_activated' => 'Tenant Activated',
        'tenant_plan_changed' => 'Tenant Plan Changed',

        // Projects
        'project_created' => 'Project Created',
        'project_updated' => 'Project Updated',
        'project_deleted' => 'Project Deleted',
        'project_archived' => 'Project Archived',

        // Tasks
        'task_created' => 'Task Created',
        'task_updated' => 'Task Updated',
        'task_deleted' => 'Task Deleted',
        'task_completed' => 'Task Completed',
        'task_assigned' => 'Task Assigned',

        // Time Tracking
        'timer_started' => 'Timer Started',
        'timer_stopped' => 'Timer Stopped',
        'time_entry_created' => 'Time Entry Created',
        'time_entry_updated' => 'Time Entry Updated',
        'time_entry_deleted' => 'Time Entry Deleted',

        // Invoicing
        'invoice_created' => 'Invoice Created',
        'invoice_updated' => 'Invoice Updated',
        'invoice_deleted' => 'Invoice Deleted',
        'invoice_sent' => 'Invoice Sent',
        'invoice_paid' => 'Invoice Paid',
        'invoice_cancelled' => 'Invoice Cancelled',
        'chorus_pro_sent' => 'Sent to Chorus Pro',

        // Payments
        'payment_received' => 'Payment Received',
        'payment_refunded' => 'Payment Refunded',
        'payment_failed' => 'Payment Failed',

        // Expenses
        'expense_created' => 'Expense Created',
        'expense_updated' => 'Expense Updated',
        'expense_deleted' => 'Expense Deleted',
        'expense_approved' => 'Expense Approved',
        'expense_rejected' => 'Expense Rejected',

        // Settings
        'settings_updated' => 'Settings Updated',
        'api_key_created' => 'API Key Created',
        'api_key_deleted' => 'API Key Deleted',

        // Data Export
        'data_exported' => 'Data Exported',
        'fec_exported' => 'FEC Export',
        'backup_created' => 'Backup Created',

        // System
        'system_error' => 'System Error',
        'maintenance_mode_enabled' => 'Maintenance Mode Enabled',
        'maintenance_mode_disabled' => 'Maintenance Mode Disabled',
    ];

    /**
     * Get the user that performed the activity
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the tenant
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Scope for filtering by type
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope for filtering by user
     */
    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope for filtering by tenant
     */
    public function scopeByTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Scope for recent activities
     */
    public function scopeRecent($query, $days = 7)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Log an activity
     */
    public static function log(string $type, string $description, array $properties = [], ?User $user = null, ?Tenant $tenant = null): self
    {
        return self::create([
            'user_id' => $user?->id ?? auth()->id(),
            'tenant_id' => $tenant?->id ?? auth()->user()?->tenant_id,
            'type' => $type,
            'description' => $description,
            'properties' => $properties,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Get formatted type label
     */
    public function getTypeLabel(): string
    {
        return self::TYPES[$this->type] ?? ucfirst(str_replace('_', ' ', $this->type));
    }

    /**
     * Get icon for activity type
     */
    public function getIcon(): string
    {
        $icons = [
            'user_login' => 'ArrowRightOnRectangleIcon',
            'user_logout' => 'ArrowLeftOnRectangleIcon',
            'user_created' => 'UserPlusIcon',
            'user_deleted' => 'UserMinusIcon',
            'invoice_created' => 'DocumentTextIcon',
            'invoice_sent' => 'PaperAirplaneIcon',
            'invoice_paid' => 'CheckCircleIcon',
            'payment_received' => 'CurrencyEuroIcon',
            'project_created' => 'FolderPlusIcon',
            'task_completed' => 'CheckBadgeIcon',
            'timer_started' => 'PlayIcon',
            'timer_stopped' => 'StopIcon',
            'expense_approved' => 'CheckIcon',
            'expense_rejected' => 'XMarkIcon',
            'data_exported' => 'ArrowDownTrayIcon',
            'settings_updated' => 'CogIcon',
            'system_error' => 'ExclamationTriangleIcon',
        ];

        return $icons[$this->type] ?? 'InformationCircleIcon';
    }

    /**
     * Get color for activity type
     */
    public function getColor(): string
    {
        $colors = [
            'user_login' => 'blue',
            'user_logout' => 'gray',
            'user_deleted' => 'red',
            'user_suspended' => 'yellow',
            'invoice_paid' => 'green',
            'payment_received' => 'green',
            'payment_failed' => 'red',
            'expense_rejected' => 'red',
            'system_error' => 'red',
            'maintenance_mode_enabled' => 'orange',
        ];

        return $colors[$this->type] ?? 'gray';
    }
}