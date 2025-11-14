<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Models\Attachment;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use HasFactory, SoftDeletes, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'client_id',
        'code',
        'name',
        'description',
        'status',
        'billing_type',
        'visibility',
        'start_date',
        'end_date',
        'deadline',
        'budget',
        'hourly_rate',
        'daily_rate',
        'estimated_hours',
        'estimated_days',
        'monthly_amount',
        'contract_duration',
        'billing_frequency',
        'color',
        'is_billable',
        'is_template',
        'progress',
        'settings',
        'custom_fields',
        'created_by'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'deadline' => 'date',
        'budget' => 'decimal:2',
        'hourly_rate' => 'decimal:2',
        'daily_rate' => 'decimal:2',
        'estimated_hours' => 'decimal:2',
        'estimated_days' => 'decimal:2',
        'monthly_amount' => 'decimal:2',
        'contract_duration' => 'integer',
        'is_billable' => 'boolean',
        'is_template' => 'boolean',
        'progress' => 'integer',
        'settings' => 'array',
        'custom_fields' => 'array'
    ];

    /**
     * Get the client that owns the project
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * Get all tasks for this project
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    /**
     * Get all time entries for this project
     */
    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }

    /**
     * Get all users assigned to this project
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_users')
            ->withPivot('role', 'hourly_rate', 'is_active')
            ->withTimestamps();
    }

    /**
     * Get all invoices for this project
     */
    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    /**
     * Get all expenses for this project
     */
    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    /**
     * Get all attachments for this project
     */
    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    /**
     * Get total hours tracked
     */
    public function getTotalHoursAttribute(): float
    {
        return $this->timeEntries()->sum('duration_seconds') / 3600;
    }

    /**
     * Get total billable hours
     */
    public function getBillableHoursAttribute(): float
    {
        return $this->timeEntries()
            ->where('is_billable', true)
            ->sum('duration_seconds') / 3600;
    }

    /**
     * Get budget progress percentage
     */
    public function getBudgetProgressAttribute(): float
    {
        if ($this->budget_type === 'hours' && $this->budget_hours > 0) {
            return ($this->total_hours / $this->budget_hours) * 100;
        }

        if ($this->budget_type === 'amount' && $this->budget_amount > 0) {
            $totalRevenue = $this->timeEntries()
                ->where('is_billable', true)
                ->sum(\DB::raw('duration_seconds / 3600 * hourly_rate'));

            return ($totalRevenue / $this->budget_amount) * 100;
        }

        return 0;
    }

    /**
     * Check if project is overdue
     */
    public function isOverdue(): bool
    {
        return $this->deadline && $this->deadline->isPast() && $this->status !== 'completed';
    }

    /**
     * Check if project is over budget
     */
    public function isOverBudget(): bool
    {
        return $this->getBudgetProgressAttribute() > 100;
    }
}
