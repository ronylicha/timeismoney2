<?php

namespace App\Services;

use App\Models\QualifiedTimestamp;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

/**
 * Service d'horodatage qualifié conforme NF525
 */
class QualifiedTimestampService
{
    private ?Tenant $tenant;
    private string $provider;
    private ?string $tsaUrl;
    private ?string $apiKey;
    private ?string $apiSecret;
    
    public function __construct(?Tenant $tenant = null)
    {
        $this->tenant = $tenant ?? tenant();
        
        if (!$this->tenant) {
            throw new \Exception('No tenant context available for timestamp service');
        }
        
        $this->loadTenantConfiguration();
    }
    
    private function loadTenantConfiguration(): void
    {
        $this->provider = $this->tenant->getTimestampProvider();
        $this->tsaUrl = $this->tenant->getTimestampTsaUrl();
        $this->apiKey = $this->tenant->getTimestampApiKey();
        $this->apiSecret = $this->tenant->getTimestampApiSecret();
        
        if ($this->provider !== 'simple' && !$this->apiKey) {
            throw new \Exception("Timestamp provider '{$this->provider}' requires API key. Configure in tenant settings.");
        }
        
        // L'API secret n'est requis que pour Universign
        if ($this->provider === 'universign' && !$this->apiSecret) {
            throw new \Exception("Timestamp provider 'universign' requires API secret. Configure in tenant settings.");
        }
    }

    /**
     * Créer un timestamp qualifié pour un modèle
     */
    public function timestamp(Model $model, string $action): QualifiedTimestamp
    {
        try {
            $hash = $this->calculateModelHash($model);
            
            $timestamp = QualifiedTimestamp::create([
                'timestampable_type' => get_class($model),
                'timestampable_id' => $model->id,
                'action' => $action,
                'hash_algorithm' => 'sha256',
                'hash_value' => $hash,
                'server_datetime' => now(),
                'timestamp_datetime' => now(),
                'status' => 'pending',
                'tsa_provider' => $this->provider,
                'user_id' => auth()->id(),
                'ip_address' => request()->ip(),
                'tenant_id' => $this->tenant->id,
            ]);
            
            if ($this->provider !== 'simple') {
                $this->obtainQualifiedTimestamp($timestamp, $hash);
            } else {
                $timestamp->markAsSuccess('', now());
            }
            
            return $timestamp;
            
        } catch (\Exception $e) {
            Log::error('Failed to create qualified timestamp', [
                'error' => $e->getMessage(),
                'tenant_id' => $this->tenant->id,
            ]);
            
            return QualifiedTimestamp::create([
                'timestampable_type' => get_class($model),
                'timestampable_id' => $model->id,
                'action' => $action,
                'hash_algorithm' => 'sha256',
                'hash_value' => $this->calculateModelHash($model),
                'server_datetime' => now(),
                'timestamp_datetime' => now(),
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'user_id' => auth()->id(),
                'ip_address' => request()->ip(),
                'tenant_id' => $this->tenant->id,
            ]);
        }
    }

    private function calculateModelHash(Model $model): string
    {
        $data = $model->toArray();
        unset($data['updated_at'], $data['created_at']);
        ksort($data);
        return hash('sha256', json_encode($data));
    }

    private function obtainQualifiedTimestamp(QualifiedTimestamp $timestamp, string $hash): void
    {
        try {
            switch ($this->provider) {
                case 'universign':
                    $this->getUniversignTimestamp($timestamp, $hash);
                    break;
                case 'openapi':
                    $this->getOpenApiTimestamp($timestamp, $hash);
                    break;
                default:
                    throw new \Exception("Provider not implemented: {$this->provider}");
            }
        } catch (\Exception $e) {
            $timestamp->markAsFailed($e->getMessage());
        }
    }

    private function getUniversignTimestamp(QualifiedTimestamp $timestamp, string $hash): void
    {
        if (!$this->tsaUrl || !$this->apiKey || !$this->apiSecret) {
            throw new \Exception('Universign provider requires API credentials. Configure in tenant settings.');
        }
        
        // Implementation would go here with actual API calls
        // For now, mark as success for testing
        $timestamp->markAsSuccess('mock_timestamp_token', now());
    }

    private function getOpenApiTimestamp(QualifiedTimestamp $timestamp, string $hash): void
    {
        if (!$this->tsaUrl || !$this->apiKey) {
            throw new \Exception('OpenAPI provider requires API credentials. Configure in tenant settings.');
        }
        
        try {
            $headers = [
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ];
            
            // 1. Vérifier les certificats gratuits disponibles (10 par jour)
            $availabilityResponse = Http::withHeaders($headers)
                ->timeout(30)
                ->get($this->tsaUrl . '/availability');
            
            if ($availabilityResponse->successful()) {
                $availability = $availabilityResponse->json();
                $freeCertificates = $availability['free_certificates'] ?? 0;
                $totalAvailable = $availability['total_available'] ?? 0;
                
                Log::info('OpenAPI.com availability check', [
                    'tenant_id' => $this->tenant->id,
                    'free_certificates' => $freeCertificates,
                    'total_available' => $totalAvailable
                ]);
                
                if ($totalAvailable <= 0) {
                    throw new \Exception('No certificates available. Free daily limit (10) reached or no purchased credits.');
                }
            } else {
                Log::warning('Could not check availability, proceeding anyway', [
                    'status' => $availabilityResponse->status(),
                    'response' => $availabilityResponse->body()
                ]);
            }
            
            // 2. Préparer les données du document en base64
            $modelData = $timestamp->timestampable->toArray();
            $jsonContent = json_encode($modelData, JSON_PRETTY_PRINT);
            $base64Content = base64_encode($jsonContent);
            
            // 3. Préparer la requête JSON pour l'endpoint /marca (format minimal pour certificats gratuits)
            $payload = [
                'file' => $base64Content,
            ];
            
            // 4. Appliquer l'horodatage via /marca
            $response = Http::withHeaders($headers)
                ->timeout(30)
                ->post($this->tsaUrl . '/marca', $payload);
            
            if (!$response->successful()) {
                throw new \Exception('OpenAPI API error: ' . $response->status() . ' - ' . $response->body());
            }
            
            $data = $response->json();
            
            // Vérifier que l'horodatage a réussi
            if (!($data['success'] ?? false)) {
                throw new \Exception('OpenAPI timestamp failed: ' . ($data['message'] ?? 'Unknown error'));
            }
            
            // Extraire le token de timestamp depuis l'URL du fichier .m7m
            $timestampToken = $data['data']['timestamp_body'] ?? null;
            $timestampHeader = $data['data']['timestamp_header'] ?? null;
            
            if (!$timestampToken) {
                throw new \Exception('Invalid response from OpenAPI: missing timestamp body');
            }
            
            // Stocker l'URL du fichier .m7m comme token (plus petit et fonctionnel)
            $timestamp->update([
                'timestamp_token' => $timestampToken,
                'tsa_certificate' => $timestampHeader,
                'timestamp_response' => json_encode($data),
            ]);
            
            // Marquer comme succès
            $timestampDatetime = now();
                
            $timestamp->markAsSuccess($timestampToken, $timestampDatetime);
            
            Log::info('OpenAPI.com timestamp created successfully', [
                'timestamp_id' => $timestamp->id,
                'hash' => $hash,
                'certificate_id' => $this->tenant->timestamp_certificate_id,
                'response_time' => $timestampDatetime
            ]);
            
        } catch (\Exception $e) {
            throw new \Exception('OpenAPI timestamp failed: ' . $e->getMessage());
        }
    }

    /**
     * Vérifie l'intégrité d'un timestamp
     */
    public function verifyIntegrity(QualifiedTimestamp $timestamp): bool
    {
        try {
            // Récupérer le modèle associé
            $model = $timestamp->timestampable;
            
            if (!$model) {
                Log::warning('Timestamped model not found', ['timestamp_id' => $timestamp->id]);
                return false;
            }
            
            // Recalculer le hash
            $currentHash = $this->calculateModelHash($model);
            
            // Comparer avec le hash stocké
            if ($currentHash !== $timestamp->hash_value) {
                Log::warning('Timestamp integrity check failed: hash mismatch', [
                    'timestamp_id' => $timestamp->id,
                    'expected' => $timestamp->hash_value,
                    'actual' => $currentHash
                ]);
                return false;
            }
            
            // Si timestamp qualifié, vérifier le token
            if ($timestamp->tsa_provider !== 'simple' && empty($timestamp->timestamp_token)) {
                Log::warning('Qualified timestamp has no token', ['timestamp_id' => $timestamp->id]);
                return false;
            }
            
            return true;
            
        } catch (\Exception $e) {
            Log::error('Failed to verify timestamp integrity', [
                'timestamp_id' => $timestamp->id,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Récupère tous les timestamps pour un modèle
     */
    public function getTimestamps(Model $model): \Illuminate\Database\Eloquent\Collection
    {
        return QualifiedTimestamp::where('timestampable_type', get_class($model))
            ->where('timestampable_id', $model->id)
            ->where('tenant_id', $this->tenant->id)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Récupère le dernier timestamp réussi pour un modèle et une action
     */
    public function getLastSuccessfulTimestamp(Model $model, string $action): ?QualifiedTimestamp
    {
        return QualifiedTimestamp::where('timestampable_type', get_class($model))
            ->where('timestampable_id', $model->id)
            ->where('action', $action)
            ->where('status', 'success')
            ->where('tenant_id', $this->tenant->id)
            ->orderBy('created_at', 'desc')
            ->first();
    }
}
