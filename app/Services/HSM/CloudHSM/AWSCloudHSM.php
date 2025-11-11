<?php

namespace App\Services\HSM\CloudHSM;

use App\Services\HSM\HSMInterface;
use Aws\CloudHsm\CloudHsmClient;
use Aws\Kms\KmsClient;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * AWS CloudHSM Implementation
 *
 * This implementation uses AWS Key Management Service (KMS) with CloudHSM backend
 * for production-grade cryptographic operations.
 *
 * Requirements:
 * - AWS Account with CloudHSM or KMS configured
 * - composer require aws/aws-sdk-php
 */
class AWSCloudHSM implements HSMInterface
{
    protected KmsClient $kmsClient;
    protected array $config;

    public function __construct()
    {
        $this->config = [
            'version' => 'latest',
            'region' => config('hsm.cloud.region', env('HSM_CLOUD_REGION', 'eu-west-3')), // Paris region
            'credentials' => [
                'key' => config('hsm.cloud.access_key', env('HSM_CLOUD_ACCESS_KEY')),
                'secret' => config('hsm.cloud.secret_key', env('HSM_CLOUD_SECRET_KEY')),
            ]
        ];

        // Validate configuration
        if (empty($this->config['credentials']['key']) || empty($this->config['credentials']['secret'])) {
            throw new \Exception('AWS KMS credentials not configured. Please set HSM_CLOUD_ACCESS_KEY and HSM_CLOUD_SECRET_KEY in .env');
        }

        $this->kmsClient = new KmsClient($this->config);

        Log::info('AWS CloudHSM/KMS initialized', [
            'region' => $this->config['region']
        ]);
    }

    /**
     * Generate a new key pair in AWS KMS
     */
    public function generateKeyPair(string $keyId, array $options = []): array
    {
        try {
            // Create a Customer Master Key (CMK) for signing
            $result = $this->kmsClient->createKey([
                'Description' => "Signing key: {$keyId}",
                'KeyUsage' => 'SIGN_VERIFY',
                'KeySpec' => $this->mapAlgorithmToKeySpec($options['algorithm'] ?? 'RSA'),
                'Origin' => 'AWS_KMS', // or 'AWS_CLOUDHSM' if using CloudHSM
                'Tags' => [
                    [
                        'TagKey' => 'Purpose',
                        'TagValue' => 'ElectronicSignature',
                    ],
                    [
                        'TagKey' => 'KeyId',
                        'TagValue' => $keyId,
                    ],
                ],
            ]);

            $awsKeyId = $result['KeyMetadata']['KeyId'];

            // Create an alias for easier reference
            $this->kmsClient->createAlias([
                'AliasName' => "alias/timeismoney-{$keyId}",
                'TargetKeyId' => $awsKeyId,
            ]);

            // Get the public key
            $publicKeyResult = $this->kmsClient->getPublicKey([
                'KeyId' => $awsKeyId,
            ]);

            Log::info('AWS KMS key created', [
                'key_id' => $keyId,
                'aws_key_id' => $awsKeyId,
                'algorithm' => $publicKeyResult['SigningAlgorithms'][0]
            ]);

            return [
                'key_id' => $keyId,
                'aws_key_id' => $awsKeyId,
                'public_key' => base64_encode($publicKeyResult['PublicKey']),
                'algorithm' => $publicKeyResult['SigningAlgorithms'][0],
                'key_spec' => $publicKeyResult['KeySpec']
            ];

        } catch (Exception $e) {
            Log::error('Failed to create AWS KMS key', [
                'key_id' => $keyId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Sign data using AWS KMS
     */
    public function sign(string $data, string $keyId, string $algorithm = 'RS256'): string
    {
        try {
            $awsKeyId = $this->getAwsKeyId($keyId);

            // AWS KMS requires the data to be hashed first for RSA signatures
            $messageType = 'DIGEST';
            $message = hash('sha256', $data, true);

            $result = $this->kmsClient->sign([
                'KeyId' => $awsKeyId,
                'Message' => $message,
                'MessageType' => $messageType,
                'SigningAlgorithm' => $this->mapAlgorithmToAws($algorithm),
            ]);

            Log::debug('Data signed with AWS KMS', [
                'key_id' => $keyId,
                'aws_key_id' => $awsKeyId,
                'algorithm' => $algorithm
            ]);

            return base64_encode($result['Signature']);

        } catch (Exception $e) {
            Log::error('Failed to sign with AWS KMS', [
                'key_id' => $keyId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Verify a signature using AWS KMS
     */
    public function verify(string $data, string $signature, string $keyId, string $algorithm = 'RS256'): bool
    {
        try {
            $awsKeyId = $this->getAwsKeyId($keyId);

            // Hash the data
            $message = hash('sha256', $data, true);

            $result = $this->kmsClient->verify([
                'KeyId' => $awsKeyId,
                'Message' => $message,
                'MessageType' => 'DIGEST',
                'Signature' => base64_decode($signature),
                'SigningAlgorithm' => $this->mapAlgorithmToAws($algorithm),
            ]);

            Log::debug('Signature verified with AWS KMS', [
                'key_id' => $keyId,
                'valid' => $result['SignatureValid']
            ]);

            return $result['SignatureValid'];

        } catch (Exception $e) {
            Log::error('Failed to verify with AWS KMS', [
                'key_id' => $keyId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Get the public key from AWS KMS
     */
    public function getPublicKey(string $keyId): string
    {
        try {
            $awsKeyId = $this->getAwsKeyId($keyId);

            $result = $this->kmsClient->getPublicKey([
                'KeyId' => $awsKeyId,
            ]);

            // Convert to PEM format
            $publicKey = "-----BEGIN PUBLIC KEY-----\n";
            $publicKey .= chunk_split(base64_encode($result['PublicKey']), 64);
            $publicKey .= "-----END PUBLIC KEY-----\n";

            return $publicKey;

        } catch (Exception $e) {
            Log::error('Failed to get public key from AWS KMS', [
                'key_id' => $keyId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Delete a key (schedule deletion in AWS KMS)
     */
    public function deleteKey(string $keyId): bool
    {
        try {
            $awsKeyId = $this->getAwsKeyId($keyId);

            // Schedule key deletion (minimum 7 days in the future)
            $this->kmsClient->scheduleKeyDeletion([
                'KeyId' => $awsKeyId,
                'PendingWindowInDays' => 7, // Minimum allowed
            ]);

            // Delete the alias
            try {
                $this->kmsClient->deleteAlias([
                    'AliasName' => "alias/timeismoney-{$keyId}",
                ]);
            } catch (Exception $e) {
                // Alias might not exist
            }

            Log::info('AWS KMS key scheduled for deletion', [
                'key_id' => $keyId,
                'aws_key_id' => $awsKeyId,
                'deletion_in_days' => 7
            ]);

            return true;

        } catch (Exception $e) {
            Log::error('Failed to delete AWS KMS key', [
                'key_id' => $keyId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * List all keys
     */
    public function listKeys(): array
    {
        try {
            $keys = [];
            $aliases = $this->kmsClient->listAliases();

            foreach ($aliases['Aliases'] as $alias) {
                if (str_starts_with($alias['AliasName'], 'alias/timeismoney-')) {
                    $keyId = str_replace('alias/timeismoney-', '', $alias['AliasName']);

                    // Get key metadata
                    try {
                        $metadata = $this->kmsClient->describeKey([
                            'KeyId' => $alias['TargetKeyId'],
                        ]);

                        $keys[] = [
                            'key_id' => $keyId,
                            'aws_key_id' => $alias['TargetKeyId'],
                            'status' => $metadata['KeyMetadata']['KeyState'],
                            'created_at' => $metadata['KeyMetadata']['CreationDate'],
                            'key_usage' => $metadata['KeyMetadata']['KeyUsage'],
                            'key_spec' => $metadata['KeyMetadata']['KeySpec'] ?? null,
                        ];
                    } catch (Exception $e) {
                        // Key might be deleted or inaccessible
                    }
                }
            }

            return $keys;

        } catch (Exception $e) {
            Log::error('Failed to list AWS KMS keys', [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }

    /**
     * Check if a key exists
     */
    public function keyExists(string $keyId): bool
    {
        try {
            $awsKeyId = $this->getAwsKeyId($keyId);

            $result = $this->kmsClient->describeKey([
                'KeyId' => $awsKeyId,
            ]);

            return $result['KeyMetadata']['KeyState'] === 'Enabled';

        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Get certificate (not directly supported by KMS)
     */
    public function getCertificate(string $keyId): ?string
    {
        // AWS KMS doesn't directly manage certificates
        // You would need to use AWS Certificate Manager (ACM) for this
        // or store certificates separately
        return null;
    }

    /**
     * Store certificate (not directly supported by KMS)
     */
    public function storeCertificate(string $keyId, string $certificate): bool
    {
        // Would need to implement using AWS Certificate Manager
        // or store in a separate service like S3 or DynamoDB
        Log::warning('Certificate storage not implemented for AWS KMS', [
            'key_id' => $keyId
        ]);
        return false;
    }

    /**
     * Get HSM status
     */
    public function getStatus(): array
    {
        try {
            // Get account key statistics
            $keys = $this->listKeys();

            return [
                'mode' => 'aws_kms',
                'status' => 'operational',
                'region' => $this->config['region'],
                'key_count' => count($keys),
                'keys' => array_map(fn($k) => $k['key_id'], $keys),
                'features' => [
                    'fips_140_2_level_3' => true,
                    'high_availability' => true,
                    'backup' => true,
                    'audit_logs' => true,
                ]
            ];

        } catch (Exception $e) {
            return [
                'mode' => 'aws_kms',
                'status' => 'error',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Get AWS Key ID from our key ID
     */
    protected function getAwsKeyId(string $keyId): string
    {
        // Try using the alias first
        $alias = "alias/timeismoney-{$keyId}";

        try {
            $result = $this->kmsClient->describeKey([
                'KeyId' => $alias,
            ]);
            return $result['KeyMetadata']['KeyId'];
        } catch (Exception $e) {
            // If alias doesn't exist, assume keyId is the AWS key ID
            return $keyId;
        }
    }

    /**
     * Map our algorithm to AWS signing algorithm
     */
    protected function mapAlgorithmToAws(string $algorithm): string
    {
        return match($algorithm) {
            'RS256' => 'RSASSA_PKCS1_V1_5_SHA_256',
            'RS384' => 'RSASSA_PKCS1_V1_5_SHA_384',
            'RS512' => 'RSASSA_PKCS1_V1_5_SHA_512',
            'PS256' => 'RSASSA_PSS_SHA_256',
            'PS384' => 'RSASSA_PSS_SHA_384',
            'PS512' => 'RSASSA_PSS_SHA_512',
            'ES256' => 'ECDSA_SHA_256',
            'ES384' => 'ECDSA_SHA_384',
            'ES512' => 'ECDSA_SHA_512',
            default => 'RSASSA_PKCS1_V1_5_SHA_256'
        };
    }

    /**
     * Map algorithm to AWS Key Spec
     */
    protected function mapAlgorithmToKeySpec(string $algorithm): string
    {
        if (str_starts_with($algorithm, 'ES')) {
            return match($algorithm) {
                'ES256' => 'ECC_NIST_P256',
                'ES384' => 'ECC_NIST_P384',
                'ES512' => 'ECC_NIST_P521',
                default => 'ECC_NIST_P256'
            };
        }

        // RSA keys
        return match($algorithm) {
            'RS256', 'PS256' => 'RSA_2048',
            'RS384', 'PS384' => 'RSA_3072',
            'RS512', 'PS512' => 'RSA_4096',
            default => 'RSA_2048'
        };
    }
}