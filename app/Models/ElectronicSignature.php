<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;

/**
 * Modèle pour suivre les signatures électroniques
 * 
 * Enregistre toutes les informations de signature pour audit et conformité
 */
class ElectronicSignature extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'signable_type',
        'signable_id',
        'signature_id',
        'signer_name',
        'signer_email',
        'signer_role',
        'signature_level',
        'certificate_info',
        'signature_time',
        'location',
        'reason',
        'original_file_path',
        'signed_file_path',
        'timestamp_info',
        'validation_result',
        'processing_time',
        'status',
        'error_message',
        'metadata',
        'ip_address',
        'user_agent',
        'signed_by',
    ];

    protected $casts = [
        'signature_time' => 'datetime',
        'certificate_info' => 'array',
        'timestamp_info' => 'array',
        'validation_result' => 'array',
        'metadata' => 'array',
        'processing_time' => 'decimal:2',
    ];

    /**
     * Relation polymorphe avec le document signé
     */
    public function signable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Relation avec l'utilisateur qui a signé
     */
    public function signer()
    {
        return $this->belongsTo(User::class, 'signed_by');
    }

    /**
     * Scope pour les signatures valides
     */
    public function scopeValid($query)
    {
        return $query->where('status', 'valid');
    }

    /**
     * Scope pour les signatures en attente
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope pour les signatures échouées
     */
    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    /**
     * Scope pour les signatures qualifiées (QES)
     */
    public function scopeQualified($query)
    {
        return $query->where('signature_level', 'QES');
    }

    /**
     * Scope pour une période donnée
     */
    public function scopeInPeriod($query, $startDate, $endDate)
    {
        return $query->whereBetween('signature_time', [$startDate, $endDate]);
    }

    /**
     * Vérifie si la signature est valide
     */
    public function isValid(): bool
    {
        return $this->status === 'valid' && 
               $this->validation_result && 
               ($this->validation_result['valid'] ?? false);
    }

    /**
     * Vérifie si la signature est qualifiée
     */
    public function isQualified(): bool
    {
        return $this->signature_level === 'QES';
    }

    /**
     * Vérifie si la signature a un horodatage
     */
    public function hasTimestamp(): bool
    {
        return !empty($this->timestamp_info);
    }

    /**
     * Obtient le chemin du fichier signé
     */
    public function getSignedFilePath(): string
    {
        return $this->signed_file_path ?? $this->original_file_path;
    }

    /**
     * Obtient le temps de traitement formaté
     */
    public function getFormattedProcessingTime(): string
    {
        return $this->processing_time ? $this->processing_time . ' ms' : 'N/A';
    }

    /**
     * Obtient le statut formaté avec icône
     */
    public function getFormattedStatus(): string
    {
        return match ($this->status) {
            'valid' => '✅ Valide',
            'pending' => '⏳ En attente',
            'failed' => '❌ Échouée',
            'expired' => '⚠️ Expirée',
            'revoked' => '🚫 Révoquée',
            default => '❓ Inconnu',
        };
    }

    /**
     * Obtient le niveau de signature formaté
     */
    public function getFormattedSignatureLevel(): string
    {
        return match ($this->signature_level) {
            'QES' => 'QES - Qualifiée',
            'AES' => 'AES - Avancée',
            'SES' => 'SES - Simple',
            default => $this->signature_level,
        };
    }

    /**
     * Vérifie si le certificat est valide
     */
    public function isCertificateValid(): bool
    {
        if (!$this->certificate_info) {
            return false;
        }

        $expiryDate = $this->certificate_info['expiry_date'] ?? null;
        if ($expiryDate) {
            return now()->lt($expiryDate);
        }

        return true;
    }

    /**
     * Obtient les informations du certificat
     */
    public function getCertificateInfo(): array
    {
        return $this->certificate_info ?? [];
    }

    /**
     * Crée une entrée de signature
     */
    public static function createSignature(array $data): self
    {
        return static::create([
            'signature_id' => $data['signature_id'] ?? 'SIG-' . uniqid(),
            'signable_type' => $data['signable_type'],
            'signable_id' => $data['signable_id'],
            'signer_name' => $data['signer_name'],
            'signer_email' => $data['signer_email'] ?? null,
            'signer_role' => $data['signer_role'] ?? 'Signataire',
            'signature_level' => $data['signature_level'] ?? 'QES',
            'certificate_info' => $data['certificate_info'] ?? null,
            'signature_time' => $data['signature_time'] ?? now(),
            'location' => $data['location'] ?? null,
            'reason' => $data['reason'] ?? 'Signature de document Factur-X',
            'original_file_path' => $data['original_file_path'],
            'signed_file_path' => $data['signed_file_path'] ?? null,
            'timestamp_info' => $data['timestamp_info'] ?? null,
            'validation_result' => $data['validation_result'] ?? null,
            'processing_time' => $data['processing_time'] ?? null,
            'status' => $data['status'] ?? 'pending',
            'error_message' => $data['error_message'] ?? null,
            'metadata' => $data['metadata'] ?? null,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'signed_by' => auth()->id(),
        ]);
    }

    /**
     * Met à jour le statut de la signature
     */
    public function updateStatus(string $status, ?string $errorMessage = null): bool
    {
        $this->status = $status;
        
        if ($errorMessage) {
            $this->error_message = $errorMessage;
        }

        return $this->save();
    }

    /**
     * Met à jour le résultat de validation
     */
    public function updateValidationResult(array $validationResult): bool
    {
        $this->validation_result = $validationResult;
        $this->status = $validationResult['valid'] ? 'valid' : 'failed';
        
        return $this->save();
    }

    /**
     * Ajoute les informations d'horodatage
     */
    public function addTimestampInfo(array $timestampInfo): bool
    {
        $this->timestamp_info = $timestampInfo;
        
        return $this->save();
    }

    /**
     * Vérifie la conformité eIDAS
     */
    public function isEidasCompliant(): bool
    {
        return $this->isQualified() && 
               $this->hasTimestamp() && 
               $this->isCertificateValid() &&
               $this->isValid();
    }

    /**
     * Obtient un résumé pour l'audit
     */
    public function getAuditSummary(): array
    {
        return [
            'signature_id' => $this->signature_id,
            'signer' => [
                'name' => $this->signer_name,
                'email' => $this->signer_email,
                'role' => $this->signer_role,
            ],
            'signature' => [
                'level' => $this->signature_level,
                'time' => $this->signature_time,
                'location' => $this->location,
                'reason' => $this->reason,
            ],
            'status' => $this->status,
            'valid' => $this->isValid(),
            'eidas_compliant' => $this->isEidasCompliant(),
            'has_timestamp' => $this->hasTimestamp(),
            'processing_time' => $this->processing_time,
            'files' => [
                'original' => $this->original_file_path,
                'signed' => $this->signed_file_path,
            ],
        ];
    }

    /**
     * Recherche les signatures par ID
     */
    public static function findBySignatureId(string $signatureId): ?self
    {
        return static::where('signature_id', $signatureId)->first();
    }

    /**
     * Obtient les statistiques de signature
     */
    public static function getStatistics(?\DateTime $startDate = null, ?\DateTime $endDate = null): array
    {
        $query = static::query();

        if ($startDate) {
            $query->where('signature_time', '>=', $startDate);
        }

        if ($endDate) {
            $query->where('signature_time', '<=', $endDate);
        }

        $total = $query->count();
        $valid = $query->valid()->count();
        $failed = $query->failed()->count();
        $qualified = $query->qualified()->count();
        $withTimestamp = $query->whereNotNull('timestamp_info')->count();

        return [
            'total' => $total,
            'valid' => $valid,
            'failed' => $failed,
            'qualified' => $qualified,
            'with_timestamp' => $withTimestamp,
            'success_rate' => $total > 0 ? round(($valid / $total) * 100, 2) : 0,
            'qualification_rate' => $total > 0 ? round(($qualified / $total) * 100, 2) : 0,
            'timestamp_rate' => $total > 0 ? round(($withTimestamp / $total) * 100, 2) : 0,
        ];
    }
}