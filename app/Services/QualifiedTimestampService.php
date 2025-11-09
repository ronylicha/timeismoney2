<?php

namespace App\Services;

use App\Models\QualifiedTimestamp;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

/**
 * Service d'horodatage qualifié conforme NF525
 */
class QualifiedTimestampService
{
    private string $provider;
    private ?string $tsaUrl;
    private ?string $apiKey;
    private ?string $apiSecret;
    
    public function __construct()
    {
        $this->provider = config('timestamp.provider', 'simple');
        $this->tsaUrl = config('timestamp.tsa_url');
        $this->apiKey = config('timestamp.api_key');
        $this->apiSecret = config('timestamp.api_secret');
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
            ]);
            
            if ($this->provider !== 'simple') {
                $this->obtainQualifiedTimestamp($timestamp, $hash);
            } else {
                $timestamp->markAsSuccess('', now());
            }
            
            return $timestamp;
            
        } catch (\Exception $e) {
            Log::error('Failed to create qualified timestamp', [
                'error' => $e->getMessage()
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
                default:
                    throw new \Exception("Provider not implemented: {$this->provider}");
            }
        } catch (\Exception $e) {
            $timestamp->markAsFailed($e->getMessage());
        }
    }

    private function getUniversignTimestamp(QualifiedTimestamp $timestamp, string $hash): void
    {
        throw new \Exception('Universign provider requires API credentials. Configure in config/timestamp.php');
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
            ->orderBy('created_at', 'desc')
            ->first();
    }
}
