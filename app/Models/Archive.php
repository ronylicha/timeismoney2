<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use App\Traits\BelongsToTenant;

/**
 * Archive légale de documents fiscaux
 * 
 * Obligation légale : Conservation 10 ans (LPF Art. L102 B)
 * - Factures et avoirs
 * - FacturX (PDF/A-3 + XML EN 16931)
 * - Exports FEC
 * - Reçus de paiement
 * 
 * @property int $id
 * @property int $tenant_id
 * @property string $archivable_type
 * @property int $archivable_id
 * @property string $document_type
 * @property string $format
 * @property string|null $document_number
 * @property \Carbon\Carbon|null $document_date
 * @property string|null $client_name
 * @property float|null $document_amount
 * @property string $storage_path
 * @property string $storage_disk
 * @property int $file_size
 * @property string $mime_type
 * @property string $original_filename
 * @property string $hash_algorithm
 * @property string $hash_value
 * @property bool $is_encrypted
 * @property string|null $encryption_method
 * @property \Carbon\Carbon $archived_at
 * @property \Carbon\Carbon $retention_until
 * @property bool $is_legal_requirement
 * @property string $retention_status
 * @property int|null $qualified_timestamp_id
 * @property array|null $metadata
 * @property string|null $notes
 * @property int|null $archived_by
 * @property string $archive_source
 * @property \Carbon\Carbon|null $last_accessed_at
 * @property int $access_count
 * @property bool $is_backed_up
 * @property \Carbon\Carbon|null $last_backup_at
 * @property string|null $backup_location
 */
class Archive extends Model
{
    use SoftDeletes, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'archivable_type',
        'archivable_id',
        'document_type',
        'format',
        'document_number',
        'document_date',
        'client_name',
        'document_amount',
        'storage_path',
        'storage_disk',
        'file_size',
        'mime_type',
        'original_filename',
        'hash_algorithm',
        'hash_value',
        'is_encrypted',
        'encryption_method',
        'archived_at',
        'retention_until',
        'is_legal_requirement',
        'retention_status',
        'qualified_timestamp_id',
        'metadata',
        'notes',
        'archived_by',
        'archive_source',
        'last_accessed_at',
        'access_count',
        'is_backed_up',
        'last_backup_at',
        'backup_location',
    ];

    protected $casts = [
        'document_date' => 'date',
        'document_amount' => 'decimal:2',
        'file_size' => 'integer',
        'is_encrypted' => 'boolean',
        'archived_at' => 'datetime',
        'retention_until' => 'datetime',
        'is_legal_requirement' => 'boolean',
        'metadata' => 'array',
        'last_accessed_at' => 'datetime',
        'access_count' => 'integer',
        'is_backed_up' => 'boolean',
        'last_backup_at' => 'datetime',
    ];

    /**
     * Relation polymorphique vers le document source
     */
    public function archivable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Tenant propriétaire
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Utilisateur ayant archivé
     */
    public function archivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'archived_by');
    }

    /**
     * Horodatage qualifié associé
     */
    public function qualifiedTimestamp(): BelongsTo
    {
        return $this->belongsTo(QualifiedTimestamp::class);
    }

    /**
     * Scopes
     */
    public function scopeActive($query)
    {
        return $query->where('retention_status', 'active');
    }

    public function scopeExpired($query)
    {
        return $query->where('retention_until', '<', now())
                     ->where('retention_status', 'active');
    }

    public function scopeLocked($query)
    {
        return $query->where('retention_status', 'locked');
    }

    public function scopeInvoices($query)
    {
        return $query->where('document_type', 'invoice');
    }

    public function scopeCreditNotes($query)
    {
        return $query->where('document_type', 'credit_note');
    }

    public function scopeFacturX($query)
    {
        return $query->where('format', 'facturx');
    }

    /**
     * Méthodes utilitaires
     */

    /**
     * Vérifie si l'archive est encore dans sa période de rétention obligatoire
     */
    public function isWithinRetentionPeriod(): bool
    {
        return $this->retention_until->isFuture();
    }

    /**
     * Vérifie si l'archive peut être supprimée
     */
    public function canBeDeleted(): bool
    {
        return !$this->isWithinRetentionPeriod() 
            && $this->retention_status !== 'locked' 
            && !$this->is_legal_requirement;
    }

    /**
     * Calcule le nombre de jours restants de rétention
     */
    public function daysUntilExpiration(): int
    {
        return max(0, now()->diffInDays($this->retention_until, false));
    }

    /**
     * Récupère le contenu du fichier archivé
     */
    public function getFileContent(): ?string
    {
        if (!Storage::disk($this->storage_disk)->exists($this->storage_path)) {
            return null;
        }

        return Storage::disk($this->storage_disk)->get($this->storage_path);
    }

    /**
     * Vérifie l'intégrité du fichier archivé
     */
    public function verifyIntegrity(): bool
    {
        $content = $this->getFileContent();
        
        if (!$content) {
            return false;
        }

        $currentHash = hash($this->hash_algorithm, $content);
        
        return hash_equals($this->hash_value, $currentHash);
    }

    /**
     * Enregistre un accès au fichier
     */
    public function recordAccess(): void
    {
        $this->increment('access_count');
        $this->update(['last_accessed_at' => now()]);
    }

    /**
     * Verrouille l'archive (audit, litige)
     */
    public function lock(string $reason = null): void
    {
        $metadata = $this->metadata ?? [];
        $metadata['locked_at'] = now()->toIso8601String();
        $metadata['lock_reason'] = $reason;
        
        $this->update([
            'retention_status' => 'locked',
            'metadata' => $metadata
        ]);
    }

    /**
     * Déverrouille l'archive
     */
    public function unlock(): void
    {
        $metadata = $this->metadata ?? [];
        $metadata['unlocked_at'] = now()->toIso8601String();
        
        $this->update([
            'retention_status' => 'active',
            'metadata' => $metadata
        ]);
    }

    /**
     * Marque comme sauvegardé
     */
    public function markAsBackedUp(string $location): void
    {
        $this->update([
            'is_backed_up' => true,
            'last_backup_at' => now(),
            'backup_location' => $location
        ]);
    }

    /**
     * Obtient la taille du fichier formatée
     */
    public function getFormattedFileSize(): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $size = $this->file_size;
        $unitIndex = 0;

        while ($size >= 1024 && $unitIndex < count($units) - 1) {
            $size /= 1024;
            $unitIndex++;
        }

        return round($size, 2) . ' ' . $units[$unitIndex];
    }

    /**
     * Obtient la description du type de document
     */
    public function getDocumentTypeLabel(): string
    {
        return match($this->document_type) {
            'invoice' => 'Facture',
            'credit_note' => 'Avoir',
            'quote' => 'Devis',
            'payment_receipt' => 'Reçu de paiement',
            'fec_export' => 'Export FEC',
            default => 'Autre'
        };
    }

    /**
     * Obtient le statut de rétention formaté
     */
    public function getRetentionStatusLabel(): string
    {
        return match($this->retention_status) {
            'active' => 'En cours de conservation',
            'expired' => 'Délai expiré',
            'locked' => 'Verrouillé',
            'deleted' => 'Marqué pour suppression',
            default => 'Inconnu'
        };
    }
}
