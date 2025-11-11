<?php

namespace App\Services\HSM;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use phpseclib3\Crypt\RSA;
use phpseclib3\Crypt\PublicKeyLoader;

/**
 * HSM Simulator for development environments
 *
 * This class simulates HSM operations for local development.
 * It stores keys in encrypted format on the local filesystem.
 *
 * WARNING: This is for development only and should NEVER be used in production!
 */
class HSMSimulator implements HSMInterface
{
    protected string $storagePath;
    protected string $disk = 'local';

    public function __construct()
    {
        $this->storagePath = config('services.hsm.simulator_storage', 'hsm-simulator');

        // Ensure storage directory exists
        if (!Storage::disk($this->disk)->exists($this->storagePath)) {
            Storage::disk($this->disk)->makeDirectory($this->storagePath);
        }

        Log::warning('HSM Simulator is active. This should only be used in development!');
    }

    /**
     * Generate a new key pair
     */
    public function generateKeyPair(string $keyId, array $options = []): array
    {
        $keySize = $options['key_size'] ?? 2048;
        $algorithm = $options['algorithm'] ?? 'RSA';

        // Generate RSA key pair
        $privateKey = RSA::createKey($keySize);

        // Get public key
        $publicKey = $privateKey->getPublicKey();

        // Store encrypted private key
        $privateKeyPath = $this->getKeyPath($keyId, 'private');
        $publicKeyPath = $this->getKeyPath($keyId, 'public');

        // Encrypt private key before storing (using Laravel's encryption)
        $encryptedPrivateKey = Crypt::encryptString($privateKey->toString('PKCS8'));
        Storage::disk($this->disk)->put($privateKeyPath, $encryptedPrivateKey);

        // Store public key (no encryption needed)
        Storage::disk($this->disk)->put($publicKeyPath, $publicKey->toString('PKCS8'));

        // Store metadata
        $this->storeMetadata($keyId, [
            'created_at' => now()->toIso8601String(),
            'algorithm' => $algorithm,
            'key_size' => $keySize,
            'status' => 'active'
        ]);

        Log::info("HSM Simulator: Generated key pair", ['key_id' => $keyId]);

        return [
            'public_key' => $publicKey->toString('PKCS8'),
            'key_id' => $keyId,
            'algorithm' => $algorithm,
            'key_size' => $keySize
        ];
    }

    /**
     * Sign data using a stored private key
     */
    public function sign(string $data, string $keyId, string $algorithm = 'RS256'): string
    {
        $privateKeyPath = $this->getKeyPath($keyId, 'private');

        if (!Storage::disk($this->disk)->exists($privateKeyPath)) {
            throw new \Exception("Key not found: {$keyId}");
        }

        // Read and decrypt private key
        $encryptedKey = Storage::disk($this->disk)->get($privateKeyPath);
        $privateKeyString = Crypt::decryptString($encryptedKey);

        // Load the private key
        $privateKey = PublicKeyLoader::loadPrivateKey($privateKeyString);

        // Configure signature algorithm
        $hash = match($algorithm) {
            'RS256' => 'sha256',
            'RS384' => 'sha384',
            'RS512' => 'sha512',
            default => 'sha256'
        };

        $privateKey = $privateKey->withHash($hash)->withMGFHash($hash);

        // Sign the data
        $signature = $privateKey->sign($data);

        Log::debug("HSM Simulator: Data signed", [
            'key_id' => $keyId,
            'algorithm' => $algorithm,
            'data_length' => strlen($data)
        ]);

        return base64_encode($signature);
    }

    /**
     * Verify a signature
     */
    public function verify(string $data, string $signature, string $keyId, string $algorithm = 'RS256'): bool
    {
        $publicKeyPath = $this->getKeyPath($keyId, 'public');

        if (!Storage::disk($this->disk)->exists($publicKeyPath)) {
            throw new \Exception("Key not found: {$keyId}");
        }

        // Read public key
        $publicKeyString = Storage::disk($this->disk)->get($publicKeyPath);
        $publicKey = PublicKeyLoader::loadPublicKey($publicKeyString);

        // Configure signature algorithm
        $hash = match($algorithm) {
            'RS256' => 'sha256',
            'RS384' => 'sha384',
            'RS512' => 'sha512',
            default => 'sha256'
        };

        $publicKey = $publicKey->withHash($hash)->withMGFHash($hash);

        // Verify the signature
        $isValid = $publicKey->verify($data, base64_decode($signature));

        Log::debug("HSM Simulator: Signature verified", [
            'key_id' => $keyId,
            'algorithm' => $algorithm,
            'valid' => $isValid
        ]);

        return $isValid;
    }

    /**
     * Get the public key for a given key ID
     */
    public function getPublicKey(string $keyId): string
    {
        $publicKeyPath = $this->getKeyPath($keyId, 'public');

        if (!Storage::disk($this->disk)->exists($publicKeyPath)) {
            throw new \Exception("Key not found: {$keyId}");
        }

        return Storage::disk($this->disk)->get($publicKeyPath);
    }

    /**
     * Delete a key pair
     */
    public function deleteKey(string $keyId): bool
    {
        $privateKeyPath = $this->getKeyPath($keyId, 'private');
        $publicKeyPath = $this->getKeyPath($keyId, 'public');
        $metadataPath = $this->getKeyPath($keyId, 'metadata');
        $certificatePath = $this->getKeyPath($keyId, 'certificate');

        $deleted = false;

        if (Storage::disk($this->disk)->exists($privateKeyPath)) {
            Storage::disk($this->disk)->delete($privateKeyPath);
            $deleted = true;
        }

        if (Storage::disk($this->disk)->exists($publicKeyPath)) {
            Storage::disk($this->disk)->delete($publicKeyPath);
            $deleted = true;
        }

        if (Storage::disk($this->disk)->exists($metadataPath)) {
            Storage::disk($this->disk)->delete($metadataPath);
        }

        if (Storage::disk($this->disk)->exists($certificatePath)) {
            Storage::disk($this->disk)->delete($certificatePath);
        }

        Log::info("HSM Simulator: Key deleted", ['key_id' => $keyId]);

        return $deleted;
    }

    /**
     * List all available keys
     */
    public function listKeys(): array
    {
        $keys = [];
        $files = Storage::disk($this->disk)->files($this->storagePath);

        foreach ($files as $file) {
            if (str_ends_with($file, '.metadata.json')) {
                $keyId = str_replace([$this->storagePath . '/', '.metadata.json'], '', $file);
                $metadata = json_decode(Storage::disk($this->disk)->get($file), true);

                $keys[] = array_merge([
                    'key_id' => $keyId
                ], $metadata);
            }
        }

        return $keys;
    }

    /**
     * Check if a key exists
     */
    public function keyExists(string $keyId): bool
    {
        $privateKeyPath = $this->getKeyPath($keyId, 'private');
        $publicKeyPath = $this->getKeyPath($keyId, 'public');

        return Storage::disk($this->disk)->exists($privateKeyPath)
            && Storage::disk($this->disk)->exists($publicKeyPath);
    }

    /**
     * Get certificate for a key
     */
    public function getCertificate(string $keyId): ?string
    {
        $certificatePath = $this->getKeyPath($keyId, 'certificate');

        if (!Storage::disk($this->disk)->exists($certificatePath)) {
            return null;
        }

        return Storage::disk($this->disk)->get($certificatePath);
    }

    /**
     * Store a certificate for a key
     */
    public function storeCertificate(string $keyId, string $certificate): bool
    {
        if (!$this->keyExists($keyId)) {
            throw new \Exception("Key not found: {$keyId}");
        }

        $certificatePath = $this->getKeyPath($keyId, 'certificate');
        Storage::disk($this->disk)->put($certificatePath, $certificate);

        // Update metadata
        $metadata = $this->getMetadata($keyId);
        $metadata['certificate_stored_at'] = now()->toIso8601String();
        $this->storeMetadata($keyId, $metadata);

        Log::info("HSM Simulator: Certificate stored", ['key_id' => $keyId]);

        return true;
    }

    /**
     * Get HSM status
     */
    public function getStatus(): array
    {
        $keys = $this->listKeys();

        return [
            'mode' => 'simulator',
            'status' => 'operational',
            'warning' => 'This is a development simulator and should not be used in production',
            'storage_path' => $this->storagePath,
            'key_count' => count($keys),
            'keys' => array_map(fn($k) => $k['key_id'], $keys)
        ];
    }

    /**
     * Get the storage path for a key component
     */
    protected function getKeyPath(string $keyId, string $type): string
    {
        $extension = match($type) {
            'private' => '.key.encrypted',
            'public' => '.pub',
            'certificate' => '.cert',
            'metadata' => '.metadata.json',
            default => ''
        };

        return $this->storagePath . '/' . $keyId . $extension;
    }

    /**
     * Store metadata for a key
     */
    protected function storeMetadata(string $keyId, array $metadata): void
    {
        $metadataPath = $this->getKeyPath($keyId, 'metadata');
        Storage::disk($this->disk)->put($metadataPath, json_encode($metadata, JSON_PRETTY_PRINT));
    }

    /**
     * Get metadata for a key
     */
    protected function getMetadata(string $keyId): array
    {
        $metadataPath = $this->getKeyPath($keyId, 'metadata');

        if (!Storage::disk($this->disk)->exists($metadataPath)) {
            return [];
        }

        return json_decode(Storage::disk($this->disk)->get($metadataPath), true);
    }
}