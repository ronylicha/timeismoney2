<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'tenant_id',
        'name',
        'first_name',
        'last_name',
        'email',
        'password',
        'phone',
        'avatar',
        'job_title',
        'department',
        'bio',
        'locale',
        'timezone',
        'date_format',
        'time_format',
        'theme',
        'hourly_rate',
        'is_active',
        'last_login_at',
        'last_login_ip',
        'email_verified_at',
        'preferences',
        'two_factor_enabled',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'google_id',
        'google_access_token',
        'google_refresh_token',
        'google_calendar_id',
        'google_calendar_enabled',
        'google_token_expires_at',
        'push_notifications_enabled',
        'email_notifications_enabled',
        'timer_reminders_enabled',
        'invoice_notifications_enabled',
        'project_notifications_enabled',
        'task_notifications_enabled',
        'quiet_hours_enabled',
        'quiet_hours_start',
        'quiet_hours_end',
    ];

    /**
     * The attributes that should be hidden for serialization.
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'google_access_token',
        'google_refresh_token',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at' => 'datetime',
        'is_active' => 'boolean',
        'two_factor_enabled' => 'boolean',
        'hourly_rate' => 'decimal:2',
        'preferences' => 'array',
        'password' => 'hashed',
        'google_calendar_enabled' => 'boolean',
        'google_token_expires_at' => 'datetime',
        'push_notifications_enabled' => 'boolean',
        'email_notifications_enabled' => 'boolean',
        'timer_reminders_enabled' => 'boolean',
        'invoice_notifications_enabled' => 'boolean',
        'project_notifications_enabled' => 'boolean',
        'task_notifications_enabled' => 'boolean',
        'quiet_hours_enabled' => 'boolean',
    ];

    /**
     * The accessors to append to the model's array form.
     */
    protected $appends = [
        'role',
        'role_names',
        'permissions_array'
    ];

    /**
     * Get the tenant that owns the user
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the team member profile
     */
    public function teamMember(): HasOne
    {
        return $this->hasOne(TeamMember::class);
    }

    /**
     * Get all time entries for the user
     */
    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }

    /**
     * Get all tasks assigned to the user
     */
    public function tasks(): BelongsToMany
    {
        return $this->belongsToMany(Task::class, 'task_users')
            ->withPivot('role', 'assigned_hours')
            ->withTimestamps();
    }

    /**
     * Get all projects assigned to the user
     */
    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'project_users')
            ->withPivot('role', 'hourly_rate', 'is_active')
            ->withTimestamps();
    }

    /**
     * Get the user's active timer
     */
    public function activeTimer(): HasOne
    {
        return $this->hasOne(TimeEntry::class)
            ->whereNull('ended_at')
            ->latest();
    }

    /**
     * Get the user's notification preferences
     */
    public function notificationPreferences(): HasMany
    {
        return $this->hasMany(NotificationPreference::class);
    }

    /**
     * Get the user's push subscriptions
     */
    public function pushSubscriptions(): HasMany
    {
        return $this->hasMany(PushSubscription::class);
    }

    /**
     * Get the user's notification logs
     */
    public function notificationLogs(): HasMany
    {
        return $this->hasMany(NotificationLog::class);
    }

    /**
     * Get the user's dashboard widgets
     */
    public function dashboardWidgets(): HasMany
    {
        return $this->hasMany(DashboardWidget::class);
    }

    /**
     * Get the user's API keys
     */
    public function apiKeys(): HasMany
    {
        return $this->hasMany(ApiKey::class);
    }

    /**
     * Check if user has an active timer
     */
    public function hasActiveTimer(): bool
    {
        return $this->activeTimer()->exists();
    }

    /**
     * Get total hours tracked today
     */
    public function getTodayHoursAttribute(): float
    {
        return $this->timeEntries()
            ->whereDate('started_at', today())
            ->sum('duration_seconds') / 3600;
    }

    /**
     * Get total hours tracked this week
     */
    public function getWeekHoursAttribute(): float
    {
        return $this->timeEntries()
            ->whereBetween('started_at', [now()->startOfWeek(), now()->endOfWeek()])
            ->sum('duration_seconds') / 3600;
    }

    /**
     * Get total hours tracked this month
     */
    public function getMonthHoursAttribute(): float
    {
        return $this->timeEntries()
            ->whereMonth('started_at', now()->month)
            ->whereYear('started_at', now()->year)
            ->sum('duration_seconds') / 3600;
    }

    /**
     * Check if user is admin of their tenant
     */
    public function isTenantAdmin(): bool
    {
        return $this->hasRole('admin') || $this->hasRole('super-admin');
    }

    /**
     * Check if user can approve time entries
     */
    public function canApproveTime(): bool
    {
        return $this->teamMember?->can_approve_time ||
               $this->hasPermissionTo('approve_time_entries');
    }

    /**
     * Check if user can approve expenses
     */
    public function canApproveExpenses(): bool
    {
        return $this->teamMember?->can_approve_expenses ||
               $this->hasPermissionTo('approve_expenses');
    }

    /**
     * Get the user's primary role name (for frontend compatibility)
     * Returns the first role name or null
     */
    public function getRoleAttribute(): ?string
    {
        return $this->roles->first()?->name;
    }

    /**
     * Get all role names as array
     */
    public function getRoleNamesAttribute(): array
    {
        return $this->roles->pluck('name')->toArray();
    }

    /**
     * Get all permissions as array (for frontend)
     */
    public function getPermissionsArrayAttribute(): array
    {
        return $this->getAllPermissions()->pluck('name')->toArray();
    }

    /**
     * Check if user is super admin
     */
    public function isSuperAdmin(): bool
    {
        return $this->hasRole('super-admin');
    }

    /**
     * Check if user has admin access (super-admin or admin)
     */
    public function isAdmin(): bool
    {
        return $this->hasAnyRole(['super-admin', 'admin']);
    }
}