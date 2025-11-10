<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\BelongsToTenant;

/**
 * Horodatage qualifié conforme NF525
 * 
 * Stocke les timestamps certifiés par une Autorité de Confiance (TSA)
 * pour garantir la date et l'heure exacte d'un événement de manière
 * juridiquement opposable.
 * 
 * @property int $id
 * @property string $timestampable_type
 * @property int $timestampable_id
 * @property string $action
 * @property string $hash_algorithm
 * @property string $hash_value
 * @property string|null $timestamp_token
 * @property string|null $tsa_provider
 * @property string|null $tsa_url
 * @property string|null $tsa_certificate
 * @property \Carbon\Carbon $timestamp_datetime
 * @property \Carbon\Carbon $server_datetime
 * @property string $status
 * @property string|null $error_message
 * @property int $retry_count
 * @property int|null $user_id
 * @property string|null $ip_address
 */
class QualifiedTimestamp extends Model
{
    use BelongsToTenant;
    protected $fillable = [
        'tenant_id',
        'timestampable_type',
        'timestampable_id',
        'action',
        'hash_algorithm',
        'hash_value',
        'timestamp_token',
        'tsa_provider',
        'tsa_url',
        'tsa_certificate',
        'timestamp_datetime',
        'server_datetime',
        'status',
        'error_message',
        'retry_count',
        'user_id',
        'ip_address',
    ];

    protected $casts = [
        'timestamp_datetime' => 'datetime',
        'server_datetime' => 'datetime',
        'retry_count' => 'integer',
    ];

    /**
     * Relation polymorphique vers l'objet horodaté
     */
    public function timestampable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Utilisateur ayant déclenché l'action
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope pour les timestamps réussis
     */
    public function scopeSuccessful($query)
    {
        return $query->where('status', 'success');
    }

    /**
     * Scope pour les timestamps en échec
     */
    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    /**
     * Scope pour les timestamps en attente
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Vérifie si le timestamp est valide
     */
    public function isValid(): bool
    {
        return $this->status === 'success' && !empty($this->timestamp_token);
    }

    /**
     * Obtient le token décodé
     */
    public function getDecodedToken(): ?array
    {
        if (!$this->timestamp_token) {
            return null;
        }

        try {
            return json_decode(base64_decode($this->timestamp_token), true);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Marque le timestamp comme réussi
     */
    public function markAsSuccess(string $token, \DateTime $timestampDatetime): void
    {
        $this->update([
            'status' => 'success',
            'timestamp_token' => $token,
            'timestamp_datetime' => $timestampDatetime,
            'error_message' => null,
        ]);
    }

    /**
     * Marque le timestamp comme échoué
     */
    public function markAsFailed(string $errorMessage): void
    {
        $this->update([
            'status' => 'failed',
            'error_message' => $errorMessage,
            'retry_count' => $this->retry_count + 1,
        ]);
    }

    /**
     * Peut être retenté ?
     */
    public function canRetry(): bool
    {
        return $this->status === 'failed' && $this->retry_count < 3;
    }
}
