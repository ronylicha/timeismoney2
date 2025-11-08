<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeamMember extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'employee_id',
        'department',
        'position',
        'hourly_rate',
        'daily_rate',
        'cost_rate',
        'weekly_hours',
        'working_days',
        'work_start_time',
        'work_end_time',
        'vacation_days',
        'sick_days',
        'hire_date',
        'end_date',
        'is_billable',
        'can_approve_time',
        'can_approve_expenses',
        'skills'
    ];

    protected $casts = [
        'hourly_rate' => 'decimal:2',
        'daily_rate' => 'decimal:2',
        'cost_rate' => 'decimal:2',
        'weekly_hours' => 'integer',
        'working_days' => 'array',
        'vacation_days' => 'integer',
        'sick_days' => 'integer',
        'hire_date' => 'date',
        'end_date' => 'date',
        'is_billable' => 'boolean',
        'can_approve_time' => 'boolean',
        'can_approve_expenses' => 'boolean',
        'skills' => 'array'
    ];

    /**
     * Get the user for this team member
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}