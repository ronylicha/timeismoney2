<?php

namespace App\Models;

use App\Models\Expense;
use App\Models\Project;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Facades\Route;

class Attachment extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'attachable_type',
        'attachable_id',
        'filename',
        'original_filename',
        'path',
        'mime_type',
        'size',
        'disk'
    ];

    protected $casts = [
        'size' => 'integer'
    ];

    /**
     * Get the attachable model
     */
    public function attachable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Get the user who uploaded the attachment
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the URL attribute
     */
    public function getUrlAttribute(): string
    {
        if ($this->attachable_type === Task::class) {
            return route('api.tasks.attachments.download', [
                'task' => $this->attachable_id,
                'attachment' => $this->id,
            ]);
        }

        if ($this->attachable_type === Project::class && Route::has('api.projects.attachments.download')) {
            return route('api.projects.attachments.download', [
                'project' => $this->attachable_id,
                'attachment' => $this->id,
            ]);
        }

        if ($this->attachable_type === Expense::class && Route::has('api.expenses.attachments.download')) {
            return route('api.expenses.attachments.download', [
                'expense' => $this->attachable_id,
                'attachment' => $this->id,
            ]);
        }

        return '';
    }
}
