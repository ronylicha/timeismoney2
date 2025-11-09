<?php

namespace App\Services;

use App\Models\Archive;
use App\Models\Invoice;
use App\Models\CreditNote;
use App\Models\Quote;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Service d'archivage légal de documents fiscaux
 * 
 * Gestion de l'archivage obligatoire 10 ans (France)
 * - FacturX (PDF/A-3 + XML EN 16931)
 * - Factures et avoirs
 * - Exports FEC
 * - Reçus de paiement
 * 
 * Conformité : LPF Art. L102 B, BOI-CF-IOR-60-40
 */
class ArchiveService
{
    private string $archiveBasePath;
    private string $defaultDisk;
    private int $retentionYears;
    private QualifiedTimestampService $timestampService;
    
    public function __construct()
    {
        $this->archiveBasePath = config('archive.base_path', 'archives');
        $this->defaultDisk = config('archive.storage_disk', 'local');
        $this->retentionYears = config('archive.retention_years', 10);
        $this->timestampService = app(QualifiedTimestampService::class);
    }

    /**
     * Archive une facture avec son FacturX
     */
    public function archiveInvoice(Invoice $invoice, string $pdfContent, string $source = 'automatic'): Archive
    {
        $filename = $this->generateFilename('invoice', $invoice->invoice_number, 'pdf');
        $storagePath = $this->buildStoragePath($invoice->tenant_id, 'invoices', $filename);
        
        // Sauvegarder le fichier
        Storage::disk($this->defaultDisk)->put($storagePath, $pdfContent);
        
        // Calculer le hash
        $hash = hash('sha256', $pdfContent);
        
        // Créer l'archive
        $archive = Archive::create([
            'tenant_id' => $invoice->tenant_id,
            'archivable_type' => Invoice::class,
            'archivable_id' => $invoice->id,
            'document_type' => 'invoice',
            'format' => 'facturx',
            'document_number' => $invoice->invoice_number,
            'document_date' => $invoice->date,
            'client_name' => $invoice->client->name ?? null,
            'document_amount' => $invoice->total,
            'storage_path' => $storagePath,
            'storage_disk' => $this->defaultDisk,
            'file_size' => strlen($pdfContent),
            'mime_type' => 'application/pdf',
            'original_filename' => $filename,
            'hash_algorithm' => 'sha256',
            'hash_value' => $hash,
            'archived_at' => now(),
            'retention_until' => now()->addYears($this->retentionYears),
            'is_legal_requirement' => true,
            'retention_status' => 'active',
            'archived_by' => auth()->id(),
            'archive_source' => $source,
            'metadata' => [
                'invoice_status' => $invoice->status,
                'payment_status' => $invoice->payment_status,
                'has_facturx' => true,
            ]
        ]);
        
        // Créer un horodatage qualifié
        try {
            $timestamp = $this->timestampService->timestamp($archive, 'invoice_validated');
            $archive->update(['qualified_timestamp_id' => $timestamp->id]);
        } catch (\Exception $e) {
            Log::warning('Failed to timestamp archive', [
                'archive_id' => $archive->id,
                'error' => $e->getMessage()
            ]);
        }
        
        Log::info('Invoice archived', [
            'archive_id' => $archive->id,
            'invoice_id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'file_size' => $archive->getFormattedFileSize()
        ]);
        
        return $archive;
    }

    /**
     * Archive un avoir avec son FacturX
     */
    public function archiveCreditNote(CreditNote $creditNote, string $pdfContent, string $source = 'automatic'): Archive
    {
        $filename = $this->generateFilename('credit_note', $creditNote->credit_note_number, 'pdf');
        $storagePath = $this->buildStoragePath($creditNote->tenant_id, 'credit_notes', $filename);
        
        Storage::disk($this->defaultDisk)->put($storagePath, $pdfContent);
        $hash = hash('sha256', $pdfContent);
        
        $archive = Archive::create([
            'tenant_id' => $creditNote->tenant_id,
            'archivable_type' => CreditNote::class,
            'archivable_id' => $creditNote->id,
            'document_type' => 'credit_note',
            'format' => 'facturx',
            'document_number' => $creditNote->credit_note_number,
            'document_date' => $creditNote->date,
            'client_name' => $creditNote->client->name ?? null,
            'document_amount' => $creditNote->total_amount,
            'storage_path' => $storagePath,
            'storage_disk' => $this->defaultDisk,
            'file_size' => strlen($pdfContent),
            'mime_type' => 'application/pdf',
            'original_filename' => $filename,
            'hash_algorithm' => 'sha256',
            'hash_value' => $hash,
            'archived_at' => now(),
            'retention_until' => now()->addYears($this->retentionYears),
            'is_legal_requirement' => true,
            'retention_status' => 'active',
            'archived_by' => auth()->id(),
            'archive_source' => $source,
            'metadata' => [
                'credit_note_type' => $creditNote->type,
                'original_invoice_id' => $creditNote->invoice_id,
                'has_facturx' => true,
            ]
        ]);
        
        try {
            $timestamp = $this->timestampService->timestamp($archive, 'credit_note_created');
            $archive->update(['qualified_timestamp_id' => $timestamp->id]);
        } catch (\Exception $e) {
            Log::warning('Failed to timestamp credit note archive', [
                'archive_id' => $archive->id,
                'error' => $e->getMessage()
            ]);
        }
        
        Log::info('Credit note archived', [
            'archive_id' => $archive->id,
            'credit_note_id' => $creditNote->id,
            'credit_note_number' => $creditNote->credit_note_number
        ]);
        
        return $archive;
    }

    /**
     * Archive un export FEC
     */
    public function archiveFecExport(int $tenantId, string $csvContent, int $year, string $source = 'manual'): Archive
    {
        $filename = $this->generateFilename('fec', "FEC-{$year}", 'csv');
        $storagePath = $this->buildStoragePath($tenantId, 'fec', $filename);
        
        Storage::disk($this->defaultDisk)->put($storagePath, $csvContent);
        $hash = hash('sha256', $csvContent);
        
        $archive = Archive::create([
            'tenant_id' => $tenantId,
            'archivable_type' => null,
            'archivable_id' => null,
            'document_type' => 'fec_export',
            'format' => 'csv',
            'document_number' => "FEC-{$year}",
            'document_date' => now(),
            'storage_path' => $storagePath,
            'storage_disk' => $this->defaultDisk,
            'file_size' => strlen($csvContent),
            'mime_type' => 'text/csv',
            'original_filename' => $filename,
            'hash_algorithm' => 'sha256',
            'hash_value' => $hash,
            'archived_at' => now(),
            'retention_until' => now()->addYears($this->retentionYears),
            'is_legal_requirement' => true,
            'retention_status' => 'active',
            'archived_by' => auth()->id(),
            'archive_source' => $source,
            'metadata' => [
                'year' => $year,
                'export_date' => now()->toIso8601String(),
            ]
        ]);
        
        try {
            $timestamp = $this->timestampService->timestamp($archive, 'invoice_validated');
            $archive->update(['qualified_timestamp_id' => $timestamp->id]);
        } catch (\Exception $e) {
            Log::warning('Failed to timestamp FEC archive', [
                'archive_id' => $archive->id,
                'error' => $e->getMessage()
            ]);
        }
        
        Log::info('FEC export archived', [
            'archive_id' => $archive->id,
            'year' => $year
        ]);
        
        return $archive;
    }

    /**
     * Récupère une archive et enregistre l'accès
     */
    public function retrieveArchive(int $archiveId): ?Archive
    {
        $archive = Archive::find($archiveId);
        
        if (!$archive) {
            return null;
        }
        
        // Enregistrer l'accès
        $archive->recordAccess();
        
        return $archive;
    }

    /**
     * Vérifie l'intégrité de toutes les archives d'un tenant
     */
    public function verifyTenantArchives(int $tenantId): array
    {
        $archives = Archive::where('tenant_id', $tenantId)
            ->active()
            ->get();
        
        $results = [
            'total' => $archives->count(),
            'valid' => 0,
            'invalid' => 0,
            'missing' => 0,
            'errors' => []
        ];
        
        foreach ($archives as $archive) {
            try {
                if (!Storage::disk($archive->storage_disk)->exists($archive->storage_path)) {
                    $results['missing']++;
                    $results['errors'][] = [
                        'archive_id' => $archive->id,
                        'document_number' => $archive->document_number,
                        'error' => 'File not found'
                    ];
                    continue;
                }
                
                if ($archive->verifyIntegrity()) {
                    $results['valid']++;
                } else {
                    $results['invalid']++;
                    $results['errors'][] = [
                        'archive_id' => $archive->id,
                        'document_number' => $archive->document_number,
                        'error' => 'Integrity check failed'
                    ];
                }
            } catch (\Exception $e) {
                $results['invalid']++;
                $results['errors'][] = [
                    'archive_id' => $archive->id,
                    'document_number' => $archive->document_number,
                    'error' => $e->getMessage()
                ];
            }
        }
        
        Log::info('Archive integrity verification completed', [
            'tenant_id' => $tenantId,
            'results' => $results
        ]);
        
        return $results;
    }

    /**
     * Liste les archives arrivant à expiration
     */
    public function getExpiringArchives(int $tenantId, int $daysBeforeExpiration = 30): \Illuminate\Support\Collection
    {
        $expirationDate = now()->addDays($daysBeforeExpiration);
        
        return Archive::where('tenant_id', $tenantId)
            ->active()
            ->where('retention_until', '<=', $expirationDate)
            ->where('retention_until', '>', now())
            ->orderBy('retention_until')
            ->get();
    }

    /**
     * Nettoie les archives expirées (soft delete uniquement)
     */
    public function cleanupExpiredArchives(int $tenantId, bool $dryRun = true): array
    {
        $expiredArchives = Archive::where('tenant_id', $tenantId)
            ->where('retention_until', '<', now())
            ->where('retention_status', 'active')
            ->where('is_legal_requirement', false)
            ->get();
        
        $results = [
            'total_expired' => $expiredArchives->count(),
            'deleted' => 0,
            'skipped' => 0,
            'errors' => []
        ];
        
        foreach ($expiredArchives as $archive) {
            if ($archive->canBeDeleted()) {
                if (!$dryRun) {
                    try {
                        $archive->update(['retention_status' => 'deleted']);
                        $archive->delete(); // Soft delete
                        $results['deleted']++;
                    } catch (\Exception $e) {
                        $results['errors'][] = [
                            'archive_id' => $archive->id,
                            'error' => $e->getMessage()
                        ];
                    }
                } else {
                    $results['deleted']++;
                }
            } else {
                $results['skipped']++;
            }
        }
        
        if ($dryRun) {
            Log::info('Dry run: Archive cleanup simulation', $results);
        } else {
            Log::info('Archive cleanup completed', $results);
        }
        
        return $results;
    }

    /**
     * Sauvegarde une archive vers un emplacement externe
     */
    public function backupArchive(Archive $archive, string $backupDisk = 's3'): bool
    {
        try {
            $content = $archive->getFileContent();
            
            if (!$content) {
                throw new \Exception('Archive file not found');
            }
            
            $backupPath = $this->buildStoragePath(
                $archive->tenant_id,
                'backups/' . $archive->document_type,
                $archive->original_filename
            );
            
            Storage::disk($backupDisk)->put($backupPath, $content);
            
            $archive->markAsBackedUp($backupPath);
            
            Log::info('Archive backed up', [
                'archive_id' => $archive->id,
                'backup_disk' => $backupDisk,
                'backup_path' => $backupPath
            ]);
            
            return true;
            
        } catch (\Exception $e) {
            Log::error('Archive backup failed', [
                'archive_id' => $archive->id,
                'error' => $e->getMessage()
            ]);
            
            return false;
        }
    }

    /**
     * Statistiques d'archivage pour un tenant
     */
    public function getArchiveStatistics(int $tenantId): array
    {
        $archives = Archive::where('tenant_id', $tenantId);
        
        return [
            'total_archives' => $archives->count(),
            'active_archives' => $archives->clone()->active()->count(),
            'expired_archives' => $archives->clone()->expired()->count(),
            'locked_archives' => $archives->clone()->locked()->count(),
            'total_size_bytes' => $archives->clone()->sum('file_size'),
            'total_size_formatted' => $this->formatBytes($archives->clone()->sum('file_size')),
            'by_type' => [
                'invoices' => $archives->clone()->invoices()->count(),
                'credit_notes' => $archives->clone()->creditNotes()->count(),
                'fec_exports' => $archives->clone()->where('document_type', 'fec_export')->count(),
            ],
            'by_format' => [
                'facturx' => $archives->clone()->factorX()->count(),
                'pdf' => $archives->clone()->where('format', 'pdf')->count(),
                'csv' => $archives->clone()->where('format', 'csv')->count(),
            ],
            'oldest_archive' => $archives->clone()->orderBy('archived_at')->first()?->archived_at,
            'newest_archive' => $archives->clone()->orderBy('archived_at', 'desc')->first()?->archived_at,
            'backed_up_count' => $archives->clone()->where('is_backed_up', true)->count(),
        ];
    }

    /**
     * Helpers privés
     */
    private function generateFilename(string $type, string $identifier, string $extension): string
    {
        $timestamp = now()->format('Ymd_His');
        $sanitized = Str::slug($identifier);
        return "{$type}_{$sanitized}_{$timestamp}.{$extension}";
    }

    private function buildStoragePath(int $tenantId, string $subFolder, string $filename): string
    {
        $year = now()->year;
        $month = now()->format('m');
        return "{$this->archiveBasePath}/tenant_{$tenantId}/{$year}/{$month}/{$subFolder}/{$filename}";
    }

    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $size = $bytes;
        $unitIndex = 0;

        while ($size >= 1024 && $unitIndex < count($units) - 1) {
            $size /= 1024;
            $unitIndex++;
        }

        return round($size, 2) . ' ' . $units[$unitIndex];
    }
}
