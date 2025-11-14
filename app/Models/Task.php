<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'project_id',
        'parent_task_id',
        'code',
        'title',
        'description',
        'status',
        'priority',
        'type',
        'estimated_hours',
        'actual_hours',
        'start_date',
        'due_date',
        'completed_at',
        'is_billable',
        'hourly_rate',
        'position',
        'column_id',
        'labels',
        'checklist',
        'created_by'
    ];

    protected $casts = [
        'start_date' => 'date',
        'due_date' => 'date',
        'completed_at' => 'datetime',
        'is_billable' => 'boolean',
        'estimated_hours' => 'decimal:2',
        'actual_hours' => 'decimal:2',
        'hourly_rate' => 'decimal:2',
        'position' => 'integer',
        'labels' => 'array',
        'checklist' => 'array'
    ];

    /**
     * Append accessors to serialization
     */
    protected $appends = ['parent_id', 'assigned_users'];

    /**
     * Boot the model
     */
    protected static function booted()
    {
        static::creating(function (Task $task) {
            // Automatically set created_by to current authenticated user
            if (!$task->created_by && auth()->check()) {
                $task->created_by = auth()->id();
            }
        });
    }

    /**
     * Get the project that owns the task
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the parent task
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'parent_task_id');
    }

    /**
     * Get child tasks
     */
    public function children(): HasMany
    {
        return $this->hasMany(Task::class, 'parent_task_id');
    }

    /**
     * Get all time entries for this task
     */
    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }

    /**
     * Get the user who created the task
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get all users assigned to this task
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'task_users')
            ->withPivot('assigned_at');
    }

    /**
     * Get all comments for this task
     */
    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class, 'commentable_id')
            ->where('commentable_type', Task::class);
    }

    /**
     * Get all attachments for this task
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class, 'attachable_id')
            ->where('attachable_type', Task::class);
    }

    /**
     * Get task dependencies
     */
    public function dependencies(): BelongsToMany
    {
        return $this->belongsToMany(Task::class, 'task_dependencies', 'task_id', 'depends_on_task_id')
            ->withTimestamps();
    }

    /**
     * Get tasks that depend on this task
     */
    public function dependents(): BelongsToMany
    {
        return $this->belongsToMany(Task::class, 'task_dependencies', 'depends_on_task_id', 'task_id')
            ->withTimestamps();
    }

    /**
     * Get parent_id accessor (alias for parent_task_id)
     * Frontend uses parent_id, but DB uses parent_task_id
     */
    public function getParentIdAttribute(): ?int
    {
        return $this->parent_task_id;
    }

    /**
     * Get assigned_users accessor
     * Returns array of user IDs assigned to this task
     */
    public function getAssignedUsersAttribute(): array
    {
        // Check if users relation is loaded to avoid N+1 queries
        if ($this->relationLoaded('users')) {
            return $this->users->pluck('id')->toArray();
        }

        // If not loaded, return empty array to avoid triggering query
        return [];
    }

    /**
     * Get total tracked hours
     */
    public function getTrackedHoursAttribute(): float
    {
        return $this->timeEntries()->sum('duration_seconds') / 3600;
    }

    /**
     * Get progress percentage
     */
    public function getProgressAttribute(): float
    {
        if ($this->estimated_hours > 0) {
            return min(100, ($this->tracked_hours / $this->estimated_hours) * 100);
        }

        return $this->status === 'done' ? 100 : 0;
    }

    /**
     * Check if task is overdue
     */
    public function isOverdue(): bool
    {
        return $this->due_date && $this->due_date->isPast() && $this->status !== 'done';
    }

    /**
     * Mark task as completed
     */
    public function markAsCompleted(): void
    {
        $this->update([
            'status' => 'done',
            'completed_at' => now(),
            'actual_hours' => $this->tracked_hours
        ]);
    }

    /**
     * Scope for incomplete tasks
     */
    public function scopeIncomplete($query)
    {
        return $query->where('status', '!=', 'done');
    }

    /**
     * Scope for overdue tasks
     */
    public function scopeOverdue($query)
    {
        return $query->where('due_date', '<', now())
            ->where('status', '!=', 'completed');
    }
}