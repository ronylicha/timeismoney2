<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modèle de suivi des soumissions au Portail Public de Facturation (PDP)
 * 
 * @property int $id
 * @property string $submittable_type
 * @property int $submittable_id
 * @property string|null $pdp_id
 * @property string|null $pdp_reference
 * @property string $submission_id
 * @property string $status
 * @property array|null $submission_data
 * @property array|null $response_data
 * @property string|null $error_message
 * @property string|null $error_code
 * @property \Carbon\Carbon|null $submitted_at
 * @property \Carbon\Carbon|null $response_at
 * @property \Carbon\Carbon|null $accepted_at
 * @property \Carbon\Carbon|null $rejected_at
 * @property string $pdp_mode
 * @property string|null $facturx_path
 * @property string|null $original_filename
 * @property int|null $file_size
 * @property string|null $file_hash
 * @property int $retry_count
 * @property \Carbon\Carbon|null $next_retry_at
 * @property string|null $retry_history
 * @property int|null $user_id
 * @property string|null $ip_address
 * @property string|null $user_agent
 */
class PdpSubmission extends Model
{
    protected $fillable = [
        'submittable_type',
        'submittable_id',
        'pdp_id',
        'pdp_reference',
        'submission_id',
        'status',
        'submission_data',
        'response_data',
        'error_message',
        'error_code',
        'submitted_at',
        'response_at',
        'accepted_at',
        'rejected_at',
        'pdp_mode',
        'facturx_path',
        'original_filename',
        'file_size',
        'file_hash',
        'retry_count',
        'next_retry_at',
        'retry_history',
        'user_id',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'submission_data' => 'array',
        'response_data' => 'array',
        'retry_history' => 'array',
        'submitted_at' => 'datetime',
        'response_at' => 'datetime',
        'accepted_at' => 'datetime',
        'rejected_at' => 'datetime',
        'next_retry_at' => 'datetime',
        'retry_count' => 'integer',
        'file_size' => 'integer',
    ];

    /**
     * Relation polymorphique vers l'objet soumis (Invoice, CreditNote)
     */
    public function submittable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Utilisateur ayant effectué la soumission
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope pour les soumissions en attente
     */
    public function scopePending($query)
    {
        return $query->whereIn('status', ['pending', 'submitting', 'processing']);
    }

    /**
     * Scope pour les soumissions réussies
     */
    public function scopeSuccessful($query)
    {
        return $query->where('status', 'accepted');
    }

    /**
     * Scope pour les soumissions échouées
     */
    public function scopeFailed($query)
    {
        return $query->whereIn('status', ['rejected', 'error']);
    }

    /**
     * Scope pour les soumissions à retenter
     */
    public function scopeRetryable($query)
    {
        return $query->whereIn('status', ['error', 'rejected'])
                    ->where('retry_count', '<', 3)
                    ->whereNotNull('next_retry_at')
                    ->where('next_retry_at', '<=', now());
    }

    /**
     * Vérifie si la soumission est terminée (succès ou échec final)
     */
    public function isCompleted(): bool
    {
        return in_array($this->status, ['accepted', 'cancelled']);
    }

    /**
     * Vérifie si la soumission peut être retentée
     */
    public function canRetry(): bool
    {
        return in_array($this->status, ['error', 'rejected']) 
               && $this->retry_count < 3;
    }

    /**
     * Marque la soumission comme acceptée
     */
    public function markAsAccepted(array $responseData = []): void
    {
        $this->update([
            'status' => 'accepted',
            'response_data' => $responseData,
            'accepted_at' => now(),
            'response_at' => now(),
            'error_message' => null,
            'error_code' => null,
        ]);
    }

    /**
     * Marque la soumission comme rejetée
     */
    public function markAsRejected(string $errorMessage, string $errorCode = null, array $responseData = []): void
    {
        $this->update([
            'status' => 'rejected',
            'error_message' => $errorMessage,
            'error_code' => $errorCode,
            'response_data' => $responseData,
            'rejected_at' => now(),
            'response_at' => now(),
        ]);
    }

    /**
     * Marque la soumission en erreur technique
     */
    public function markAsError(string $errorMessage, string $errorCode = null): void
    {
        $this->update([
            'status' => 'error',
            'error_message' => $errorMessage,
            'error_code' => $errorCode,
            'retry_count' => $this->retry_count + 1,
            'next_retry_at' => $this->canRetry() ? now()->addMinutes(5 * $this->retry_count) : null,
        ]);
    }

    /**
     * Ajoute une entrée à l'historique des tentatives
     */
    public function addRetryAttempt(array $attemptData): void
    {
        $history = $this->retry_history ?? [];
        $history[] = array_merge($attemptData, [
            'attempt_number' => $this->retry_count + 1,
            'timestamp' => now()->toISOString(),
        ]);
        
        $this->update(['retry_history' => $history]);
    }

    /**
     * Génère un ID de soumission unique
     */
    public static function generateSubmissionId(): string
    {
        return 'PDP-' . date('Y') . '-' . strtoupper(uniqid());
    }
}
