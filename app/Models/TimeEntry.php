<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimeEntry extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'project_id',
        'task_id',
        'description',
        'started_at',
        'ended_at',
        'duration_seconds',
        'is_manual',
        'is_billable',
        'hourly_rate',
        'is_approved',
        'approved_by',
        'approved_at',
        'invoice_id',
        'is_locked',
        'tags'
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'is_manual' => 'boolean',
        'is_billable' => 'boolean',
        'is_approved' => 'boolean',
        'is_locked' => 'boolean',
        'hourly_rate' => 'decimal:2',
        'tags' => 'array',
        'approved_at' => 'datetime'
    ];

    protected static function booted()
    {
        static::saving(function (TimeEntry $timeEntry) {
            // Calculate duration if both times are set
            if ($timeEntry->started_at && $timeEntry->ended_at) {
                $timeEntry->duration_seconds = $timeEntry->ended_at->diffInSeconds($timeEntry->started_at);
            }

            // Set hourly rate from project or user if not set
            if (!$timeEntry->hourly_rate && $timeEntry->project_id) {
                if ($timeEntry->project->hourly_rate) {
                    $timeEntry->hourly_rate = $timeEntry->project->hourly_rate;
                } elseif ($timeEntry->user && $timeEntry->user->teamMember) {
                    $timeEntry->hourly_rate = $timeEntry->user->teamMember->hourly_rate;
                }
            }
        });
    }

    /**
     * Get the user that owns the time entry
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the project for this time entry
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the task for this time entry
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Get the invoice for this time entry
     */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    /**
     * Get the user who approved this time entry
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Get duration in hours
     */
    public function getDurationHoursAttribute(): float
    {
        return $this->duration_seconds / 3600;
    }

    /**
     * Get formatted duration (HH:MM:SS)
     */
    public function getFormattedDurationAttribute(): string
    {
        $hours = floor($this->duration_seconds / 3600);
        $minutes = floor(($this->duration_seconds % 3600) / 60);
        $seconds = $this->duration_seconds % 60;

        return sprintf('%02d:%02d:%02d', $hours, $minutes, $seconds);
    }

    /**
     * Get total amount for this entry
     */
    public function getTotalAmountAttribute(): float
    {
        if (!$this->is_billable || !$this->hourly_rate) {
            return 0;
        }

        return $this->duration_hours * $this->hourly_rate;
    }

    /**
     * Check if entry is running (no end time)
     */
    public function isRunning(): bool
    {
        return !$this->ended_at;
    }

    /**
     * Stop the timer
     */
    public function stop(): void
    {
        if ($this->isRunning()) {
            $this->ended_at = now();
            $this->save();
        }
    }

    /**
     * Scope for running timers
     */
    public function scopeRunning($query)
    {
        return $query->whereNull('ended_at');
    }

    /**
     * Scope for billable entries
     */
    public function scopeBillable($query)
    {
        return $query->where('is_billable', true);
    }

    /**
     * Scope for approved entries
     */
    public function scopeApproved($query)
    {
        return $query->where('is_approved', true);
    }

    /**
     * Scope for uninvoiced entries
     */
    public function scopeUninvoiced($query)
    {
        return $query->whereNull('invoice_id');
    }
}