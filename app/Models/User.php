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
        'email',
        'password',
        'phone',
        'avatar',
        'locale',
        'timezone',
        'date_format',
        'time_format',
        'is_active',
        'last_login_at',
        'last_login_ip',
        'email_verified_at'
    ];

    /**
     * The attributes that should be hidden for serialization.
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes'
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at' => 'datetime',
        'is_active' => 'boolean',
        'password' => 'hashed'
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
}