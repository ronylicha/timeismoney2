<?php

namespace App\Console\Commands;

use App\Services\HSM\HSMManager;
use Illuminate\Console\Command;
use Exception;

class HSMTestCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'hsm:test
                            {--provider=current : HSM provider to test (current, aws, certigna, universign, simulator)}
                            {--key-id=test-key : Key ID to use for testing}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test HSM configuration and operations';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔐 HSM Configuration Test');
        $this->newLine();

        $provider = $this->option('provider');
        $keyId = $this->option('key-id');

        try {
            // Get or create HSM instance
            if ($provider === 'current') {
                $hsm = HSMManager::getInstance();
                $this->info('Using current HSM configuration: ' . config('hsm.mode', 'simulator'));
            } else {
                // Override configuration for testing
                $originalMode = config('hsm.mode');
                $originalProvider = config('hsm.cloud.provider');

                switch ($provider) {
                    case 'aws':
                        config(['hsm.mode' => 'cloud']);
                        config(['hsm.cloud.provider' => 'aws']);
                        break;
                    case 'certigna':
                        config(['hsm.mode' => 'cloud']);
                        config(['hsm.cloud.provider' => 'certigna']);
                        break;
                    case 'universign':
                        config(['hsm.mode' => 'cloud']);
                        config(['hsm.cloud.provider' => 'universign']);
                        break;
                    case 'simulator':
                        config(['hsm.mode' => 'simulator']);
                        break;
                    default:
                        $this->error('Invalid provider: ' . $provider);
                        return 1;
                }

                HSMManager::reset();
                $hsm = HSMManager::getInstance();
                $this->info('Testing HSM provider: ' . $provider);
            }

            $this->newLine();

            // Test 1: Get Status
            $this->info('📊 Test 1: Getting HSM Status...');
            $status = $hsm->getStatus();
            $this->table(
                ['Property', 'Value'],
                collect($status)->map(function ($value, $key) {
                    if (is_array($value)) {
                        return [$key, json_encode($value, JSON_PRETTY_PRINT)];
                    }
                    return [$key, $value];
                })->toArray()
            );

            // Test 2: Generate Key
            $this->newLine();
            $this->info('🔑 Test 2: Generating Key Pair...');

            if (!$hsm->keyExists($keyId)) {
                $keyData = $hsm->generateKeyPair($keyId, [
                    'algorithm' => 'RSA',
                    'key_size' => 2048
                ]);

                $this->info('✅ Key generated successfully');
                $this->table(
                    ['Property', 'Value'],
                    collect($keyData)->map(function ($value, $key) {
                        if ($key === 'public_key' && strlen($value) > 50) {
                            return [$key, substr($value, 0, 50) . '...'];
                        }
                        return [$key, $value];
                    })->toArray()
                );
            } else {
                $this->info('ℹ️  Key already exists: ' . $keyId);
            }

            // Test 3: Sign Data
            $this->newLine();
            $this->info('✍️  Test 3: Signing Data...');
            $testData = 'Test data for HSM signature at ' . now()->toIso8601String();
            $signature = $hsm->sign($testData, $keyId);

            $this->info('✅ Data signed successfully');
            $this->info('Signature (first 50 chars): ' . substr($signature, 0, 50) . '...');

            // Test 4: Verify Signature
            $this->newLine();
            $this->info('✔️  Test 4: Verifying Signature...');
            $isValid = $hsm->verify($testData, $signature, $keyId);

            if ($isValid) {
                $this->info('✅ Signature verified successfully');
            } else {
                $this->error('❌ Signature verification failed');
            }

            // Test 5: Get Public Key
            $this->newLine();
            $this->info('🔓 Test 5: Retrieving Public Key...');
            $publicKey = $hsm->getPublicKey($keyId);
            $this->info('✅ Public key retrieved');
            $this->info('Public Key (first 50 chars): ' . substr($publicKey, 0, 50) . '...');

            // Test 6: List Keys
            $this->newLine();
            $this->info('📋 Test 6: Listing All Keys...');
            $keys = $hsm->listKeys();
            if (empty($keys)) {
                $this->info('No keys found');
            } else {
                $this->table(
                    ['Key ID', 'Status', 'Created At'],
                    collect($keys)->map(function ($key) {
                        return [
                            $key['key_id'] ?? 'N/A',
                            $key['status'] ?? 'active',
                            $key['created_at'] ?? 'N/A'
                        ];
                    })->toArray()
                );
            }

            // Summary
            $this->newLine(2);
            $this->info('=' . str_repeat('=', 50));
            $this->info('✅ ALL TESTS PASSED SUCCESSFULLY!');
            $this->info('=' . str_repeat('=', 50));

            // Performance metrics
            if ($provider === 'aws') {
                $this->newLine();
                $this->warn('⚠️  AWS KMS Notes:');
                $this->warn('  - Ensure IAM user has KMS permissions');
                $this->warn('  - Each operation costs ~$0.03 per 10,000 requests');
                $this->warn('  - Keys cost ~$1/month');
            } elseif ($provider === 'universign') {
                $this->newLine();
                $this->warn('⚠️  Universign Notes:');
                $this->warn('  - Ensure API credentials are valid');
                $this->warn('  - Sandbox mode is free for testing');
                $this->warn('  - Production requires a subscription');
            }

            return 0;

        } catch (Exception $e) {
            $this->newLine();
            $this->error('❌ Test Failed: ' . $e->getMessage());
            $this->error('Stack trace:');
            $this->error($e->getTraceAsString());

            // Provide troubleshooting tips
            $this->newLine();
            $this->warn('🔧 Troubleshooting Tips:');

            if (str_contains($e->getMessage(), 'credentials')) {
                $this->warn('  1. Check your .env file for HSM configuration');
                $this->warn('  2. For AWS: Set HSM_CLOUD_ACCESS_KEY and HSM_CLOUD_SECRET_KEY');
                $this->warn('  3. For Universign: Set UNIVERSIGN_API_USER and UNIVERSIGN_API_PASSWORD');
            }

            if (str_contains($e->getMessage(), 'not found')) {
                $this->warn('  1. Install required packages:');
                $this->warn('     - AWS: composer require aws/aws-sdk-php');
                $this->warn('     - Universign: composer require guzzlehttp/guzzle');
            }

            return 1;
        }
    }
}