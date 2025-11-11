<?php

namespace App\Services\HSM;

/**
 * Interface for Hardware Security Module operations
 * Provides a common interface for cryptographic operations
 * whether using real HSM, cloud HSM, or simulator for development
 */
interface HSMInterface
{
    /**
     * Generate a new key pair for digital signatures
     *
     * @param string $keyId Unique identifier for the key
     * @param array $options Additional options (algorithm, key size, etc.)
     * @return array ['public_key' => string, 'key_id' => string]
     */
    public function generateKeyPair(string $keyId, array $options = []): array;

    /**
     * Sign data using a stored private key
     *
     * @param string $data The data to sign
     * @param string $keyId The key identifier to use for signing
     * @param string $algorithm Signature algorithm (default: RS256)
     * @return string The digital signature
     */
    public function sign(string $data, string $keyId, string $algorithm = 'RS256'): string;

    /**
     * Verify a signature
     *
     * @param string $data The original data
     * @param string $signature The signature to verify
     * @param string $keyId The key identifier used for signing
     * @param string $algorithm Signature algorithm
     * @return bool True if signature is valid
     */
    public function verify(string $data, string $signature, string $keyId, string $algorithm = 'RS256'): bool;

    /**
     * Get the public key for a given key ID
     *
     * @param string $keyId The key identifier
     * @return string The public key in PEM format
     */
    public function getPublicKey(string $keyId): string;

    /**
     * Delete a key pair
     *
     * @param string $keyId The key identifier
     * @return bool True if deletion was successful
     */
    public function deleteKey(string $keyId): bool;

    /**
     * List all available keys
     *
     * @return array Array of key information
     */
    public function listKeys(): array;

    /**
     * Check if a key exists
     *
     * @param string $keyId The key identifier
     * @return bool
     */
    public function keyExists(string $keyId): bool;

    /**
     * Get certificate for a key (if available)
     *
     * @param string $keyId The key identifier
     * @return string|null The certificate in PEM format or null
     */
    public function getCertificate(string $keyId): ?string;

    /**
     * Store a certificate for a key
     *
     * @param string $keyId The key identifier
     * @param string $certificate The certificate in PEM format
     * @return bool
     */
    public function storeCertificate(string $keyId, string $certificate): bool;

    /**
     * Get HSM status and information
     *
     * @return array Status information
     */
    public function getStatus(): array;
}